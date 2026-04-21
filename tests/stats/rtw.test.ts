import { describe, expect, it } from 'vitest';
import type { RtwConfig } from '@/games/rtw';
import { RTW_DEFAULT_CONFIG, rtwEngine } from '@/games/rtw';
import type { RtwScoringConfig } from '@/games/rtw-scoring';
import { RTW_SCORING_DEFAULT_CONFIG, rtwScoringEngine } from '@/games/rtw-scoring';
import type { EngineSeeds } from '@/games/engine';
import { computeRtwStats, computeRtwScoringStats } from '@/stats/rtwStats';

const SESSION_ID = '01JBRTWSTAT0SESSION00000000';
const P1 = '01JBRTWSTAT0PLAYER100000000';
const STARTED_AT = '2026-04-20T09:00:00.000Z';
const NOW = '2026-04-20T09:05:00.000Z';

function seededIds(count: number): string[] {
  let x = 42;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out.push(('01JBRTWSTAT0EV000' + x.toString(36).toUpperCase().padStart(9, '0')).slice(0, 26));
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

function buildRtwEvents(config: RtwConfig, actions: Array<{ segment: 'S' | 'D' | 'T' | 'MISS' | 'SB' | 'DB'; value: number }>) {
  let state = rtwEngine.init(config, [P1], SESSION_ID, makeSeeds([]));
  const allEvents: Parameters<typeof computeRtwStats>[0] = [];
  const seeds = makeSeeds(seededIds(actions.length));

  for (const a of actions) {
    const r = rtwEngine.reduce(
      state,
      { type: 'throw', participantId: P1, segment: a.segment, value: a.value },
      seeds
    );
    if (!r.error) {
      allEvents.push(...r.emit);
      state = r.state;
    }
  }
  return { events: allEvents, state };
}

// ── RTW stats ────────────────────���─────────────────────────────────���──────────

describe('computeRtwStats', () => {
  it('returns zero stats for empty events', () => {
    const config = { ...RTW_DEFAULT_CONFIG, excludeBull: true };
    const stats = computeRtwStats([], config, {
      id: SESSION_ID,
      participants: [P1],
      startedAt: STARTED_AT
    });
    expect(stats.dartsThrown).toBe(0);
    expect(stats.targetsHit).toBe(0);
    expect(stats.hitRatePct).toBeNull();
  });

  it('counts targets hit correctly — hit once mode', () => {
    // Target 1 (hit), Target 2 (miss), Target 3 (hit) across 3-dart turns
    const config: RtwConfig = { ...RTW_DEFAULT_CONFIG, mode: '3 darts per target', excludeBull: true };
    // Turn 1 at target 1: S1(hit), miss, miss → advance
    // Turn 2 at target 2: miss, miss, miss → advance (always advances)
    // Turn 3 at target 3: S3(hit), miss, miss → advance
    const actions = [
      { segment: 'S' as const, value: 1 }, { segment: 'MISS' as const, value: 0 }, { segment: 'MISS' as const, value: 0 },
      { segment: 'MISS' as const, value: 0 }, { segment: 'MISS' as const, value: 0 }, { segment: 'MISS' as const, value: 0 },
      { segment: 'S' as const, value: 3 }, { segment: 'MISS' as const, value: 0 }, { segment: 'MISS' as const, value: 0 }
    ];
    const { events } = buildRtwEvents(config, actions);
    const stats = computeRtwStats(events, config, {
      id: SESSION_ID,
      participants: [P1],
      startedAt: STARTED_AT
    });

    expect(stats.dartsThrown).toBe(9);
    expect(stats.targetsHit).toBe(2);
    expect(stats.targetsTotal).toBe(20); // excludeBull, 20 targets
    expect(stats.hitRatePct).toBeCloseTo((2 / 3) * 100, 0);
  });

  it('marks session as completed and reports correct darts thrown', () => {
    // Use 1-dart per target so each dart = one turn, giving a clean 1:1 targetsHit count
    const config: RtwConfig = { ...RTW_DEFAULT_CONFIG, mode: '1-dart per target', excludeBull: true };
    const actions = Array.from({ length: 20 }, (_, i) => ({
      segment: 'S' as const,
      value: i + 1
    }));
    const { events, state } = buildRtwEvents(config, actions);
    expect(state.status).toBe('completed');

    const stats = computeRtwStats(events, config, {
      id: SESSION_ID,
      participants: [P1],
      startedAt: STARTED_AT
    });

    expect(stats.dartsThrown).toBe(20);
    expect(stats.targetsHit).toBe(20); // each dart = one turn, all 20 hit
    expect(stats.targetsTotal).toBe(20);
  });
});

// ── RTW Scoring stats ─────────────────────────────────────────────────────────

describe('computeRtwScoringStats', () => {
  it('scores singles correctly (1 × target value)', () => {
    const config: RtwScoringConfig = {
      ...RTW_SCORING_DEFAULT_CONFIG,
      mode: '1-dart per target',
      excludeBull: true
    };
    // Throw S1, S2, S3 — 1 dart per target, each advances
    let state = rtwScoringEngine.init(config, [P1], SESSION_ID, makeSeeds([]));
    const events: Parameters<typeof computeRtwScoringStats>[0] = [];
    const seeds = makeSeeds(seededIds(10));

    for (const [seg, val] of [['S', 1], ['S', 2], ['S', 3]] as const) {
      const r = rtwScoringEngine.reduce(
        state,
        { type: 'throw', participantId: P1, segment: seg, value: val },
        seeds
      );
      if (!r.error) {
        events.push(...r.emit);
        state = r.state;
      }
    }

    const stats = computeRtwScoringStats(events, config, {
      id: SESSION_ID,
      participants: [P1],
      startedAt: STARTED_AT
    });

    // S1=1, S2=2, S3=3 → total 6
    expect(stats.totalScore).toBe(6);
    expect(stats.dartsThrown).toBe(3);
  });

  it('scores doubles at 2× target value', () => {
    const config: RtwScoringConfig = {
      ...RTW_SCORING_DEFAULT_CONFIG,
      gameType: 'Single', // Single type for advancement; scoring is any ring
      mode: '1-dart per target',
      excludeBull: true
    };
    // D1 (double 1 = value 2): scores 2 × 1 = 2 for target 1
    let state = rtwScoringEngine.init(config, [P1], SESSION_ID, makeSeeds([]));
    const events: Parameters<typeof computeRtwScoringStats>[0] = [];
    const seeds = makeSeeds(seededIds(5));

    // For Single gameType, D1 won't hit for advancement but will score (dartScore gives 2)
    // To test scoring without advancement concern, use Double gameType
    const config2: RtwScoringConfig = { ...config, gameType: 'Double' };
    state = rtwScoringEngine.init(config2, [P1], SESSION_ID, makeSeeds([]));

    const r = rtwScoringEngine.reduce(
      state,
      { type: 'throw', participantId: P1, segment: 'D', value: 2 }, // D1 for target 1
      seeds
    );
    if (!r.error) {
      events.push(...r.emit);
      state = r.state;
    }

    const stats = computeRtwScoringStats(events, config2, {
      id: SESSION_ID,
      participants: [P1],
      startedAt: STARTED_AT
    });

    expect(stats.totalScore).toBe(2); // 2 × 1 = 2
    expect(stats.targetsHit).toBe(1);
  });

  it('triples score at 3× target value', () => {
    const config: RtwScoringConfig = {
      ...RTW_SCORING_DEFAULT_CONFIG,
      gameType: 'Triple',
      mode: '1-dart per target',
      excludeBull: true
    };
    let state = rtwScoringEngine.init(config, [P1], SESSION_ID, makeSeeds([]));
    const events: Parameters<typeof computeRtwScoringStats>[0] = [];
    const seeds = makeSeeds(seededIds(5));

    // T1 = segment T, value 3, target 1 → scores 3 × 1 = 3
    const r = rtwScoringEngine.reduce(
      state,
      { type: 'throw', participantId: P1, segment: 'T', value: 3 },
      seeds
    );
    if (!r.error) { events.push(...r.emit); state = r.state; }

    const stats = computeRtwScoringStats(events, config, {
      id: SESSION_ID,
      participants: [P1],
      startedAt: STARTED_AT
    });

    expect(stats.totalScore).toBe(3);
  });

  it('misses contribute zero score', () => {
    const config: RtwScoringConfig = {
      ...RTW_SCORING_DEFAULT_CONFIG,
      mode: '1-dart per target',
      excludeBull: true
    };
    let state = rtwScoringEngine.init(config, [P1], SESSION_ID, makeSeeds([]));
    const events: Parameters<typeof computeRtwScoringStats>[0] = [];
    const seeds = makeSeeds(seededIds(5));

    const r = rtwScoringEngine.reduce(
      state,
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      seeds
    );
    if (!r.error) { events.push(...r.emit); state = r.state; }

    const stats = computeRtwScoringStats(events, config, {
      id: SESSION_ID,
      participants: [P1],
      startedAt: STARTED_AT
    });

    expect(stats.totalScore).toBe(0);
  });
});
