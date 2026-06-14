import { describe, expect, it } from 'vitest';
import type { GameEvent, Session } from '@/domain/types';
import type { CheckoutConfig } from '@/games/checkout/config';
import { checkoutEngine } from '@/games/checkout/engine';
import type { CheckoutAction } from '@/games/checkout/types';
import type { EngineSeeds } from '@/games/engine';
import {
  aggregateCheckoutDetail,
  computeCheckoutDetail,
  type CheckoutSessionData
} from '@/stats/checkoutDetail';

const SESSION_ID = '01JCOKDET00SESSION00000000';
const P1 = '01JCOKDET00PLAYER10000000';

function makeSeeds(ids: string[]): EngineSeeds {
  const iter = ids[Symbol.iterator]();
  let counter = 0;
  return {
    now: () => '2026-04-24T09:05:00.000Z',
    newId: () => {
      const r = iter.next();
      if (!r.done) return r.value;
      return ('01JCOKDET00EV0000' + (counter++).toString().padStart(9, '0')).slice(0, 26);
    }
  };
}

function buildEvents(config: CheckoutConfig, actions: CheckoutAction[]): GameEvent[] {
  let state = checkoutEngine.init(config, [P1], SESSION_ID, makeSeeds([]));
  const events: GameEvent[] = [];
  const seeds = makeSeeds([]);
  for (const a of actions) {
    const r = checkoutEngine.reduce(state, a, seeds);
    if (!r.error) {
      events.push(...r.emit);
      state = r.state;
    }
  }
  return events;
}

function makeSession(): Session {
  return {
    schemaVersion: 1,
    id: SESSION_ID,
    gameModeId: 'checkout',
    gameConfig: { mode: 'targeted', finishes: [40], attemptsPerFinish: 2, outRule: 'double' },
    participants: [P1],
    status: 'completed',
    startedAt: '2026-04-24T09:00:00.000Z',
    createdAt: '2026-04-24T09:00:00.000Z',
    updatedAt: '2026-04-24T09:00:00.000Z'
  } as Session;
}

describe('computeCheckoutDetail', () => {
  it('tallies attempts and successes per finish', () => {
    const config: CheckoutConfig = { mode: 'targeted', finishes: [40], attemptsPerFinish: 2, outRule: 'double' };
    // A successful checkout ends the finish, so the fail must come first.
    const events = buildEvents(config, [
      { type: 'throw', participantId: P1, segment: 'S', value: 1 }, // attempt 1 ...
      { type: 'throw', participantId: P1, segment: 'S', value: 1 },
      { type: 'throw', participantId: P1, segment: 'S', value: 1 }, // 3 darts, no finish → fail
      { type: 'throw', participantId: P1, segment: 'D', value: 40 } // attempt 2 → success
    ]);
    const data = computeCheckoutDetail(events, makeSession())!;
    expect(data.totalAttempts).toBe(2);
    expect(data.totalSuccesses).toBe(1);
    expect(data.perFinish[40]).toEqual({ attempts: 2, successes: 1 });
  });
});

function session(id: string, date: string, perFinish: Record<number, { attempts: number; successes: number }>): CheckoutSessionData {
  const totalAttempts = Object.values(perFinish).reduce((a, t) => a + t.attempts, 0);
  const totalSuccesses = Object.values(perFinish).reduce((a, t) => a + t.successes, 0);
  return { sessionId: id, startedAt: date, totalAttempts, totalSuccesses, perFinish };
}

describe('aggregateCheckoutDetail', () => {
  const sessions: CheckoutSessionData[] = [
    session('a', '2026-02-01', { 40: { attempts: 2, successes: 1 }, 32: { attempts: 2, successes: 2 } }),
    session('b', '2026-02-02', { 40: { attempts: 2, successes: 0 }, 100: { attempts: 3, successes: 1 } })
  ];
  const agg = aggregateCheckoutDetail(sessions)!;

  it('computes overview totals', () => {
    expect(agg.totalSessions).toBe(2);
    expect(agg.totalAttempts).toBe(9);
    expect(agg.totalSuccesses).toBe(4);
    expect(agg.successRate).toBeCloseTo(4 / 9, 5);
  });

  it('merges per-finish across sessions, hardest first', () => {
    expect(agg.byFinish.map((f) => f.finish)).toEqual([100, 40, 32]);
    const f40 = agg.byFinish.find((f) => f.finish === 40)!;
    expect(f40.attempts).toBe(4);
    expect(f40.successes).toBe(1);
    expect(f40.rate).toBeCloseTo(0.25, 5);
    const f32 = agg.byFinish.find((f) => f.finish === 32)!;
    expect(f32.rate).toBe(1);
  });

  it('returns null when there are no attempts', () => {
    expect(aggregateCheckoutDetail([session('x', '2026-01-01', {})])).toBeNull();
  });
});
