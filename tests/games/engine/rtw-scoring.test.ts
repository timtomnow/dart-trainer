import { describe, expect, it } from 'vitest';
import type { EngineSeeds } from '@/games/engine';
import {
  RTW_SCORING_DEFAULT_CONFIG,
  type RtwScoringAction,
  type RtwScoringConfig,
  type RtwScoringMultiplier,
  type RtwScoringState,
  rtwScoringEngine
} from '@/games/rtw-scoring';

const SESSION = '01JBRTWSCORINGSES0000000000';
const P1 = '01JBRTWSCORINGPAR0000000000';
const NOW = '2026-04-20T10:00:00.000Z';

function seededIds(count: number, seed = 1): string[] {
  let x = seed;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out.push(('01JBRTWSCORINGEV0' + x.toString(36).toUpperCase().padStart(9, '0')).slice(0, 26));
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

function init(config: Partial<RtwScoringConfig> = {}): RtwScoringState {
  const cfg: RtwScoringConfig = { ...RTW_SCORING_DEFAULT_CONFIG, ...config };
  return rtwScoringEngine.init(cfg, [P1], SESSION, makeSeeds([]));
}

function run(
  state: RtwScoringState,
  actions: RtwScoringAction[],
  seeds: EngineSeeds
): { state: RtwScoringState; errors: Array<string | undefined> } {
  const errors: Array<string | undefined> = [];
  let s = state;
  for (const a of actions) {
    const r = rtwScoringEngine.reduce(s, a, seeds);
    errors.push(r.error?.code);
    if (!r.error) s = r.state;
  }
  return { state: s, errors };
}

function throws(multipliers: RtwScoringMultiplier[]): RtwScoringAction[] {
  return multipliers.map((m) => ({ type: 'throw', participantId: P1, multiplier: m }));
}

// ── Initialization ─────────────────────────────────────────────────────────────

describe('init', () => {
  it('creates 21-target sequence (1–20 + bull) for 1-20 order', () => {
    const state = init();
    expect(state.targetSequence).toHaveLength(21);
    expect(state.targetSequence[0]).toBe(1);
    expect(state.targetSequence[19]).toBe(20);
    expect(state.targetSequence[20]).toBe(25);
  });

  it('creates reversed sequence for 20-1 order', () => {
    const state = init({ order: '20-1' });
    expect(state.targetSequence[0]).toBe(20);
    expect(state.targetSequence[19]).toBe(1);
    expect(state.targetSequence[20]).toBe(25);
  });

  it('bull is always included', () => {
    const state = init();
    expect(state.targetSequence).toContain(25);
  });

  it('starts at index 0 with 0 darts in turn', () => {
    const state = init();
    expect(state.currentTargetIndex).toBe(0);
    expect(state.dartsInCurrentTurn).toBe(0);
    expect(state.totalScore).toBe(0);
    expect(state.status).toBe('in_progress');
  });
});

// ── Throw scoring ──────────────────────────────────────────────────────────────

describe('throw scoring', () => {
  it('miss scores 0', () => {
    const state = init();
    const { state: s } = run(state, throws(['miss']), makeSeeds(seededIds(1)));
    expect(s.totalScore).toBe(0);
    expect(s.dartsInCurrentTurn).toBe(1);
  });

  it('single scores 1', () => {
    const state = init();
    const { state: s } = run(state, throws(['single']), makeSeeds(seededIds(1)));
    expect(s.totalScore).toBe(1);
  });

  it('double scores 2', () => {
    const state = init();
    const { state: s } = run(state, throws(['double']), makeSeeds(seededIds(1)));
    expect(s.totalScore).toBe(2);
  });

  it('triple scores 3', () => {
    const state = init();
    const { state: s } = run(state, throws(['triple']), makeSeeds(seededIds(1)));
    expect(s.totalScore).toBe(3);
  });

  it('scores accumulate across darts', () => {
    const state = init();
    const { state: s } = run(state, throws(['single', 'double', 'triple']), makeSeeds(seededIds(3)));
    expect(s.totalScore).toBe(6);
  });
});

// ── Turn advancement ───────────────────────────────────────────────────────────

describe('turn advancement', () => {
  it('advances target after 3 darts regardless of result', () => {
    const state = init();
    const { state: s } = run(state, throws(['miss', 'miss', 'miss']), makeSeeds(seededIds(3)));
    expect(s.currentTargetIndex).toBe(1);
    expect(s.dartsInCurrentTurn).toBe(0);
  });

  it('does not advance before 3 darts', () => {
    const state = init();
    const { state: s } = run(state, throws(['single', 'single']), makeSeeds(seededIds(2)));
    expect(s.currentTargetIndex).toBe(0);
    expect(s.dartsInCurrentTurn).toBe(2);
  });

  it('turn score resets after turn closes', () => {
    const state = init();
    const seeds = makeSeeds(seededIds(6));
    const { state: s } = run(state, throws(['triple', 'triple', 'triple', 'single']), seeds);
    // After 3 darts on target 0 (score=9), start target 1 with 1 dart (score=10)
    expect(s.totalScore).toBe(10);
    expect(s.currentTargetIndex).toBe(1);
    expect(s.dartsInCurrentTurn).toBe(1);
  });
});

// ── Triple-on-Bull guard ───────────────────────────────────────────────────────

describe('triple on bull', () => {
  it('returns invalid_throw error when triple is thrown at bull', () => {
    // advance to bull (index 20) — 20 targets × 3 darts each = 60 darts
    const state = init();
    const seeds = makeSeeds(seededIds(63));
    const missActions = throws(Array.from({ length: 60 }, () => 'miss'));
    const { state: atBull } = run(state, missActions, seeds);
    expect(atBull.currentTargetIndex).toBe(20);
    expect(atBull.targetSequence[20]).toBe(25);

    const r = rtwScoringEngine.reduce(
      atBull,
      { type: 'throw', participantId: P1, multiplier: 'triple' },
      seeds
    );
    expect(r.error?.code).toBe('invalid_throw');
    expect(r.state.currentTargetIndex).toBe(20); // no change
    expect(r.state.dartsInCurrentTurn).toBe(0);  // no dart registered
  });

  it('single and double are valid on bull', () => {
    const state = init();
    const seeds = makeSeeds(seededIds(63));
    const missActions = throws(Array.from({ length: 60 }, () => 'miss'));
    const { state: atBull } = run(state, missActions, seeds);

    const r1 = rtwScoringEngine.reduce(atBull, { type: 'throw', participantId: P1, multiplier: 'single' }, seeds);
    expect(r1.error).toBeUndefined();

    const r2 = rtwScoringEngine.reduce(atBull, { type: 'throw', participantId: P1, multiplier: 'double' }, seeds);
    expect(r2.error).toBeUndefined();
  });
});

// ── Session completion ─────────────────────────────────────────────────────────

describe('session completion', () => {
  it('completes after all 21 targets', () => {
    const state = init();
    // 20 targets × 3 darts + bull × 3 darts (no triple for bull)
    const multipliers: RtwScoringMultiplier[] = [
      ...Array.from({ length: 60 }, () => 'single' as const),
      'single', 'single', 'single'
    ];
    const { state: s } = run(state, throws(multipliers), makeSeeds(seededIds(63)));
    expect(s.status).toBe('completed');
    expect(s.currentTargetIndex).toBe(21);
    expect(s.winnerParticipantId).toBe(P1);
  });

  it('rejects further throws after completion', () => {
    const state = init();
    const multipliers: RtwScoringMultiplier[] = Array.from({ length: 63 }, (_, i) =>
      i >= 60 ? 'single' : 'single'
    );
    const seeds = makeSeeds(seededIds(64));
    const { state: done } = run(state, throws(multipliers), seeds);
    expect(done.status).toBe('completed');

    const r = rtwScoringEngine.reduce(done, { type: 'throw', participantId: P1, multiplier: 'single' }, seeds);
    expect(r.error?.code).toBe('session_completed');
  });
});

// ── Forfeit ────────────────────────────────────────────────────────────────────

describe('forfeit', () => {
  it('sets status to forfeited', () => {
    const state = init();
    const seeds = makeSeeds(seededIds(1));
    const r = rtwScoringEngine.reduce(state, { type: 'forfeit', participantId: P1 }, seeds);
    expect(r.error).toBeUndefined();
    expect(r.state.status).toBe('forfeited');
  });

  it('rejects throws after forfeit', () => {
    const state = init();
    const seeds = makeSeeds(seededIds(2));
    const { state: forfeited } = run(state, [{ type: 'forfeit', participantId: P1 }], seeds);
    const r = rtwScoringEngine.reduce(forfeited, { type: 'throw', participantId: P1, multiplier: 'single' }, seeds);
    expect(r.error?.code).toBe('session_forfeited');
  });

  it('can be undone to resume in_progress', () => {
    const state = init();
    const seeds = makeSeeds(seededIds(1));
    const { state: forfeited } = run(state, [{ type: 'forfeit', participantId: P1 }], seeds);
    expect(forfeited.status).toBe('forfeited');

    const r = rtwScoringEngine.reduce(forfeited, { type: 'undo' }, makeSeeds([]));
    expect(r.error).toBeUndefined();
    expect(r.state.status).toBe('in_progress');
  });
});

// ── Undo ───────────────────────────────────────────────────────────────────────

describe('undo', () => {
  it('removes last dart', () => {
    const state = init();
    const seeds = makeSeeds(seededIds(2));
    const { state: after } = run(state, throws(['single']), seeds);
    expect(after.dartsInCurrentTurn).toBe(1);
    expect(after.totalScore).toBe(1);

    const r = rtwScoringEngine.reduce(after, { type: 'undo' }, makeSeeds([]));
    expect(r.error).toBeUndefined();
    expect(r.state.dartsInCurrentTurn).toBe(0);
    expect(r.state.totalScore).toBe(0);
  });

  it('crosses turn boundary — undoing 3rd dart reopens previous target', () => {
    const state = init();
    const seeds = makeSeeds(seededIds(4));
    // Complete one full turn (3 darts), then undo
    const { state: afterTurn } = run(state, throws(['single', 'single', 'single']), seeds);
    expect(afterTurn.currentTargetIndex).toBe(1);

    const r = rtwScoringEngine.reduce(afterTurn, { type: 'undo' }, makeSeeds([]));
    expect(r.state.currentTargetIndex).toBe(0);
    expect(r.state.dartsInCurrentTurn).toBe(2);
  });

  it('returns error on empty log', () => {
    const state = init();
    const r = rtwScoringEngine.reduce(state, { type: 'undo' }, makeSeeds([]));
    expect(r.error?.code).toBe('nothing_to_undo');
  });
});

// ── Replay property ────────────────────────────────────────────────────────────

describe('replay', () => {
  it('replay(events) equals live state', () => {
    const cfg = RTW_SCORING_DEFAULT_CONFIG;
    const multipliers: RtwScoringMultiplier[] = ['single', 'double', 'miss', 'triple', 'single', 'double'];
    let liveState = rtwScoringEngine.init(cfg, [P1], SESSION, makeSeeds([]));
    const allEvents: Parameters<typeof rtwScoringEngine.replay>[0] = [];
    const seeds = makeSeeds(seededIds(multipliers.length));

    for (const m of multipliers) {
      const r = rtwScoringEngine.reduce(liveState, { type: 'throw', participantId: P1, multiplier: m }, seeds);
      if (!r.error) {
        allEvents.push(...r.emit);
        liveState = r.state;
      }
    }

    const replayed = rtwScoringEngine.replay(allEvents, cfg, [P1], SESSION);
    expect(replayed.totalScore).toBe(liveState.totalScore);
    expect(replayed.currentTargetIndex).toBe(liveState.currentTargetIndex);
    expect(replayed.dartsInCurrentTurn).toBe(liveState.dartsInCurrentTurn);
    expect(replayed.status).toBe(liveState.status);
    expect(replayed.turns).toHaveLength(liveState.turns.length);
  });

  it('empty events match fresh init', () => {
    const cfg = RTW_SCORING_DEFAULT_CONFIG;
    const fresh = rtwScoringEngine.init(cfg, [P1], SESSION, makeSeeds([]));
    const replayed = rtwScoringEngine.replay([], cfg, [P1], SESSION);
    expect(replayed.totalScore).toBe(fresh.totalScore);
    expect(replayed.currentTargetIndex).toBe(fresh.currentTargetIndex);
    expect(replayed.status).toBe(fresh.status);
  });
});

// ── View ───────────────────────────────────────────────────────────────────────

describe('view', () => {
  it('currentTarget is null when completed', () => {
    const state = init();
    const multipliers: RtwScoringMultiplier[] = Array.from({ length: 63 }, (_, i) =>
      i >= 60 ? 'single' : 'single'
    );
    const { state: done } = run(state, throws(multipliers), makeSeeds(seededIds(63)));
    const v = rtwScoringEngine.view(done);
    expect(v.currentTarget).toBeNull();
  });

  it('totalDarts counts all recorded darts', () => {
    const state = init();
    const { state: s } = run(state, throws(['single', 'double', 'miss']), makeSeeds(seededIds(3)));
    const v = rtwScoringEngine.view(s);
    expect(v.totalDarts).toBe(3);
  });

  it('targetsHit counts turns with at least one scoring dart', () => {
    const state = init();
    // Turn 1: miss, miss, miss → 0 pts — not hit
    // Turn 2: single, miss, miss → 1 pt — hit
    const { state: s } = run(
      state,
      throws(['miss', 'miss', 'miss', 'single', 'miss', 'miss']),
      makeSeeds(seededIds(6))
    );
    const v = rtwScoringEngine.view(s);
    expect(v.targetsHit).toBe(1);
  });

  it('canUndo is false on fresh state', () => {
    const v = rtwScoringEngine.view(init());
    expect(v.canUndo).toBe(false);
  });

  it('canUndo is true after a throw', () => {
    const state = init();
    const { state: s } = run(state, throws(['single']), makeSeeds(seededIds(1)));
    expect(rtwScoringEngine.view(s).canUndo).toBe(true);
  });
});
