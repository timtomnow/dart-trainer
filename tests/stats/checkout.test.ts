import { describe, expect, it } from 'vitest';
import type { EngineSeeds } from '@/games/engine';
import type { CheckoutConfig } from '@/games/checkout/config';
import { checkoutEngine } from '@/games/checkout/engine';
import type { CheckoutAction } from '@/games/checkout/types';
import { computeCheckoutStats } from '@/stats/checkoutStats';
import type { GameEvent } from '@/domain/types';

const SESSION_ID = '01JCOKSTAT0SESSION00000000';
const P1 = '01JCOKSTAT0PLAYER10000000';
const STARTED_AT = '2026-04-24T09:00:00.000Z';
const NOW = '2026-04-24T09:05:00.000Z';

function seededIds(count: number): string[] {
  let x = 42;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out.push(('01JCOKSTAT0EV0000' + x.toString(36).toUpperCase().padStart(9, '0')).slice(0, 26));
  }
  return out;
}

function makeSeeds(ids: string[]): EngineSeeds {
  const iter = ids[Symbol.iterator]();
  return {
    now: () => NOW,
    newId: () => {
      const r = iter.next();
      if (r.done) throw new Error('ran out of ids');
      return r.value;
    }
  };
}

function buildEvents(config: CheckoutConfig, actions: CheckoutAction[]): GameEvent[] {
  let state = checkoutEngine.init(config, [P1], SESSION_ID, makeSeeds([]));
  const events: GameEvent[] = [];
  const seeds = makeSeeds(seededIds(actions.length));
  for (const a of actions) {
    const r = checkoutEngine.reduce(state, a, seeds);
    if (!r.error) {
      events.push(...r.emit);
      state = r.state;
    }
  }
  return events;
}

const SESSION_SHAPE = { id: SESSION_ID, participants: [P1], startedAt: STARTED_AT };

// ── computeCheckoutStats ──────────────────────────────────────────────────────

describe('computeCheckoutStats', () => {
  it('returns zero stats for empty events', () => {
    const config: CheckoutConfig = {
      mode: 'targeted',
      finishes: [40],
      attemptsPerFinish: 2,
      outRule: 'double'
    };
    const stats = computeCheckoutStats([], config, SESSION_SHAPE);
    expect(stats.successCount).toBe(0);
    expect(stats.totalAttempts).toBe(0);
    expect(stats.successRate).toBeNull();
    expect(stats.hardestFinishHit).toBeNull();
    expect(stats.avgDartsOnSuccess).toBeNull();
    expect(stats.dartsTaken).toHaveLength(0);
  });

  it('records a successful checkout: successCount=1, dartsTaken=[1]', () => {
    // target 40, 1 attempt, D20 → checkout in 1 dart
    const config: CheckoutConfig = {
      mode: 'targeted',
      finishes: [40],
      attemptsPerFinish: 2,
      outRule: 'double'
    };
    const events = buildEvents(config, [
      { type: 'throw', participantId: P1, segment: 'D', value: 40 }
    ]);
    const stats = computeCheckoutStats(events, config, SESSION_SHAPE);
    expect(stats.successCount).toBe(1);
    expect(stats.totalAttempts).toBe(1);
    expect(stats.successRate).toBe(100);
    expect(stats.dartsTaken).toEqual([1]);
    expect(stats.avgDartsOnSuccess).toBe(1);
    expect(stats.hardestFinishHit).toBe(40);
  });

  it('records a failed attempt then a success: successRate = 50%', () => {
    const config: CheckoutConfig = {
      mode: 'targeted',
      finishes: [40],
      attemptsPerFinish: 2,
      outRule: 'double'
    };
    const events = buildEvents(config, [
      // attempt 1: 3 misses
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      // attempt 2: checkout in 2 darts
      { type: 'throw', participantId: P1, segment: 'S', value: 20 },
      { type: 'throw', participantId: P1, segment: 'D', value: 20 }
    ]);
    const stats = computeCheckoutStats(events, config, SESSION_SHAPE);
    expect(stats.totalAttempts).toBe(2);
    expect(stats.successCount).toBe(1);
    expect(stats.successRate).toBe(50);
    expect(stats.dartsTaken).toEqual([2]);
    expect(stats.avgDartsOnSuccess).toBe(2);
  });

  it('hardestFinishHit is the highest target checkout completed', () => {
    const config: CheckoutConfig = {
      mode: 'targeted',
      finishes: [40, 100],
      attemptsPerFinish: 1,
      outRule: 'double'
    };
    const events = buildEvents(config, [
      { type: 'throw', participantId: P1, segment: 'D', value: 40 },   // hit 40
      { type: 'throw', participantId: P1, segment: 'D', value: 100 }   // hit 100
    ]);
    const stats = computeCheckoutStats(events, config, SESSION_SHAPE);
    expect(stats.hardestFinishHit).toBe(100);
  });

  it('hardestFinishHit is null when no successes', () => {
    const config: CheckoutConfig = {
      mode: 'targeted',
      finishes: [40],
      attemptsPerFinish: 1,
      outRule: 'double'
    };
    const events = buildEvents(config, [
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 }
    ]);
    const stats = computeCheckoutStats(events, config, SESSION_SHAPE);
    expect(stats.hardestFinishHit).toBeNull();
  });

  it('perFinish tracks attempts and successes per target', () => {
    const config: CheckoutConfig = {
      mode: 'targeted',
      finishes: [40, 32],
      attemptsPerFinish: 2,
      outRule: 'double'
    };
    const events = buildEvents(config, [
      // finish 40: attempt 1 bust, attempt 2 checkout
      { type: 'throw', participantId: P1, segment: 'T', value: 60 },   // bust on 40
      { type: 'throw', participantId: P1, segment: 'D', value: 40 },   // checkout 40
      // finish 32: both attempts fail
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 }
    ]);
    const stats = computeCheckoutStats(events, config, SESSION_SHAPE);

    const pf40 = stats.perFinish.find((p) => p.finish === 40)!;
    expect(pf40.attempts).toBe(2);
    expect(pf40.successes).toBe(1);
    expect(pf40.successRate).toBe(50);
    expect(pf40.bestDarts).toBe(1);

    const pf32 = stats.perFinish.find((p) => p.finish === 32)!;
    expect(pf32.attempts).toBe(2);
    expect(pf32.successes).toBe(0);
    expect(pf32.successRate).toBe(0);
    expect(pf32.bestDarts).toBeNull();
  });

  it('durationMs is computed from first startedAt to last event timestamp', () => {
    const config: CheckoutConfig = {
      mode: 'targeted',
      finishes: [40],
      attemptsPerFinish: 1,
      outRule: 'double'
    };
    const events = buildEvents(config, [
      { type: 'throw', participantId: P1, segment: 'D', value: 40 }
    ]);
    const stats = computeCheckoutStats(events, config, SESSION_SHAPE);
    // NOW = 09:05:00, STARTED_AT = 09:00:00 → 300 000 ms
    expect(stats.durationMs).toBe(300_000);
  });

  it('masters out: triple checkout is counted as success', () => {
    const config: CheckoutConfig = {
      mode: 'targeted',
      finishes: [60],
      attemptsPerFinish: 1,
      outRule: 'masters'
    };
    const events = buildEvents(config, [
      { type: 'throw', participantId: P1, segment: 'T', value: 60 }
    ]);
    const stats = computeCheckoutStats(events, config, SESSION_SHAPE);
    expect(stats.successCount).toBe(1);
  });
});
