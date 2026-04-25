import { describe, expect, it } from 'vitest';
import type { CheckoutConfig } from '@/games/checkout/config';
import { CHECKOUT_DEFAULT_CONFIG } from '@/games/checkout/config';
import { checkoutEngine } from '@/games/checkout/engine';
import { seededShuffle } from '@/games/checkout/rules';
import type { CheckoutAction } from '@/games/checkout/types';
import type { EngineSeeds } from '@/games/engine';

const SESSION = '01JCOKOUT0SESSION000000000';
const P1 = '01JCOKOUT0PLAYER100000000';
const NOW = '2026-04-24T10:00:00.000Z';

function seededIds(count: number, seed = 1): string[] {
  let x = seed;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out.push(('01JCOKOUT0EV00000' + x.toString(36).toUpperCase().padStart(9, '0')).slice(0, 26));
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

// Minimal config: 1 finish, 2 attempts, double out
const ONE_FINISH: CheckoutConfig = {
  mode: 'targeted',
  finishes: [40],
  attemptsPerFinish: 2,
  outRule: 'double'
};

// Two finishes, 2 attempts each
const TWO_FINISH: CheckoutConfig = {
  mode: 'targeted',
  finishes: [40, 32],
  attemptsPerFinish: 2,
  outRule: 'double'
};

function throwDart(segment: string, value: number): CheckoutAction {
  return { type: 'throw', participantId: P1, segment: segment as never, value };
}
function undoAction(): CheckoutAction { return { type: 'undo' }; }
function forfeitAction(): CheckoutAction { return { type: 'forfeit', participantId: P1 }; }

type RunResult = {
  state: ReturnType<typeof checkoutEngine.init>;
  emitted: Array<{ id: string }>;
  errors: Array<string | undefined>;
};

function run(
  config: CheckoutConfig,
  actions: CheckoutAction[],
  seeds: EngineSeeds
): RunResult {
  let state = checkoutEngine.init(config, [P1], SESSION, makeSeeds([]));
  const emitted: Array<{ id: string }> = [];
  const errors: Array<string | undefined> = [];
  for (const a of actions) {
    const r = checkoutEngine.reduce(state, a, seeds);
    errors.push(r.error?.code);
    for (const id of r.pop) {
      const idx = emitted.findIndex((e) => e.id === id);
      if (idx >= 0) emitted.splice(idx, 1);
    }
    for (const e of r.emit) emitted.push(e);
    if (!r.error) state = r.state;
  }
  return { state, emitted, errors };
}

// ── init ──────────────────────────────────────────────────────────────────────

describe('checkoutEngine.init', () => {
  it('starts in_progress at finish index 0', () => {
    const s = checkoutEngine.init(ONE_FINISH, [P1], SESSION, makeSeeds([]));
    expect(s.status).toBe('in_progress');
    expect(s.currentFinishIndex).toBe(0);
    expect(s.currentAttemptInFinish).toBe(0);
    expect(s.dartsInCurrentAttempt).toBe(0);
    expect(s.remainingInCurrentAttempt).toBe(40);
  });

  it('sets orderedFinishes from finishes in targeted mode', () => {
    const s = checkoutEngine.init(TWO_FINISH, [P1], SESSION, makeSeeds([]));
    expect(s.orderedFinishes).toEqual([40, 32]);
  });

  it('uses orderedFinishes for random mode when provided', () => {
    const cfg: CheckoutConfig = {
      mode: 'random',
      finishes: [40, 32],
      attemptsPerFinish: 1,
      outRule: 'double',
      orderedFinishes: [32, 40]
    };
    const s = checkoutEngine.init(cfg, [P1], SESSION, makeSeeds([]));
    expect(s.orderedFinishes).toEqual([32, 40]);
    expect(s.remainingInCurrentAttempt).toBe(32);
  });
});

// ── successful checkout ───────────────────────────────────────────────────────

describe('checkoutEngine.reduce — checkout (success)', () => {
  it('records success when last dart is a valid double finishing at 0', () => {
    const seeds = makeSeeds(seededIds(1));
    const { state } = run(ONE_FINISH, [throwDart('D', 40)], seeds);
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0]!.success).toBe(true);
    expect(state.attempts[0]!.remainingAtEnd).toBe(0);
  });

  it('completes the session when all finishes are done', () => {
    const seeds = makeSeeds(seededIds(2));
    // 1 finish, 1 attempt needed, D20=40 → done
    const cfg: CheckoutConfig = { ...ONE_FINISH, attemptsPerFinish: 1 };
    const { state } = run(cfg, [throwDart('D', 40)], seeds);
    expect(state.status).toBe('completed');
    expect(checkoutEngine.isSessionOver(state)).toEqual({ status: 'completed' });
  });

  it('advances to next finish after checkout on attempt 1', () => {
    const seeds = makeSeeds(seededIds(2));
    const { state } = run(TWO_FINISH, [throwDart('D', 40)], seeds);
    expect(state.currentFinishIndex).toBe(1);
    expect(state.currentAttemptInFinish).toBe(0);
    expect(state.remainingInCurrentAttempt).toBe(32);
  });

  it('accepts DB (bull) as a valid double finisher', () => {
    const cfg: CheckoutConfig = { ...ONE_FINISH, finishes: [50], attemptsPerFinish: 1 };
    const seeds = makeSeeds(seededIds(1));
    const { state } = run(cfg, [throwDart('DB', 50)], seeds);
    expect(state.attempts[0]!.success).toBe(true);
  });

  it('masters out: triple is a valid finisher', () => {
    const cfg: CheckoutConfig = {
      mode: 'targeted',
      finishes: [60],
      attemptsPerFinish: 1,
      outRule: 'masters'
    };
    const seeds = makeSeeds(seededIds(1));
    const { state } = run(cfg, [throwDart('T', 60)], seeds);
    expect(state.attempts[0]!.success).toBe(true);
  });
});

// ── failed attempt (miss / bust / wrong finisher) ────────────────────────────

describe('checkoutEngine.reduce — failed attempts', () => {
  it('bust: dart overshoots (remaining < 0) ends attempt immediately', () => {
    const seeds = makeSeeds(seededIds(1));
    const { state } = run(ONE_FINISH, [throwDart('T', 60)], seeds); // 60 > 40, bust
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0]!.success).toBe(false);
    expect(state.attempts[0]!.darts).toHaveLength(1);
    expect(state.currentAttemptInFinish).toBe(1); // moved to attempt 2
  });

  it('bust: reaching 0 with non-double ends attempt as failure', () => {
    // target 32: S16 + S16 = 0 but S is not a double
    const seeds = makeSeeds(seededIds(2));
    const { state } = run(ONE_FINISH, [throwDart('S', 16), throwDart('S', 16)], seeds);
    // remaining after S16 = 24, after second S16 = 8... wait, target is 40.
    // S16 = 24 remaining, S16 again = 8 remaining. Not 0 yet. Let me fix:
    // target 40: S20 + S20 = 0 but S is not double
    // Actually: 40 - 20 = 20, 20 - 20 = 0, segment='S' → bust
    expect(state.attempts).toHaveLength(0); // 8 remaining, still in attempt
    // Actually: 40-16=24, 24-16=8, 8 remaining, 2 darts so not done yet
    // This test isn't hitting 0 with wrong finisher. Let me fix:
    // The config target is 40. S20+S20 = 0 with non-double
    expect(state.dartsInCurrentAttempt).toBe(2);
    expect(state.remainingInCurrentAttempt).toBe(8); // 40-16-16=8
  });

  it('bust: reaching 0 with single when double required', () => {
    // target 40: need D20; throw S20 (remaining=20) then S20 (remaining=0, but not double) → bust
    const cfg: CheckoutConfig = { ...ONE_FINISH, finishes: [20], attemptsPerFinish: 1 };
    const seeds = makeSeeds(seededIds(1));
    const { state } = run(cfg, [throwDart('S', 20)], seeds);
    // S20 value=20, 20-20=0, but segment='S' → bust immediately
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0]!.success).toBe(false);
    expect(state.attempts[0]!.remainingAtEnd).toBe(0); // reached 0 but wrong finisher
  });

  it('3 darts exhausted without checkout: attempt ends as failure', () => {
    const seeds = makeSeeds(seededIds(3));
    const { state } = run(
      ONE_FINISH,
      [throwDart('MISS', 0), throwDart('MISS', 0), throwDart('MISS', 0)],
      seeds
    );
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0]!.success).toBe(false);
    expect(state.attempts[0]!.darts).toHaveLength(3);
    expect(state.currentAttemptInFinish).toBe(1);
    expect(state.remainingInCurrentAttempt).toBe(40); // back to full finish
  });

  it('all attempts exhausted: advances to next finish', () => {
    // 2 attempts, both with 3 misses
    const seeds = makeSeeds(seededIds(6));
    const { state } = run(
      TWO_FINISH,
      [
        throwDart('MISS', 0), throwDart('MISS', 0), throwDart('MISS', 0), // attempt 1
        throwDart('MISS', 0), throwDart('MISS', 0), throwDart('MISS', 0)  // attempt 2
      ],
      seeds
    );
    expect(state.currentFinishIndex).toBe(1); // now on finish 32
    expect(state.remainingInCurrentAttempt).toBe(32);
  });

  it('all finishes exhausted with no successes: session completed', () => {
    const seeds = makeSeeds(seededIds(12));
    const misses = Array.from({ length: 12 }, () => throwDart('MISS', 0));
    const { state } = run(TWO_FINISH, misses, seeds);
    expect(state.status).toBe('completed'); // 2 finishes × 2 attempts × 3 darts = 12
  });

  it('double out: triple finishing at 0 is not a valid finisher', () => {
    const cfg: CheckoutConfig = { ...ONE_FINISH, finishes: [60], attemptsPerFinish: 1 };
    const seeds = makeSeeds(seededIds(1));
    const { state } = run(cfg, [throwDart('T', 60)], seeds);
    // Triple reaches 0 but outRule=double → bust
    expect(state.attempts[0]!.success).toBe(false);
  });
});

// ── undo ──────────────────────────────────────────────────────────────────────

describe('checkoutEngine.reduce — undo', () => {
  it('undo with no events returns error', () => {
    const s = checkoutEngine.init(ONE_FINISH, [P1], SESSION, makeSeeds([]));
    const r = checkoutEngine.reduce(s, undoAction(), makeSeeds([]));
    expect(r.error?.code).toBe('nothing_to_undo');
  });

  it('undo removes last dart within an attempt', () => {
    const seeds = makeSeeds(seededIds(2));
    const { state } = run(ONE_FINISH, [throwDart('MISS', 0), undoAction()], seeds);
    expect(state.dartsInCurrentAttempt).toBe(0);
    expect(state.remainingInCurrentAttempt).toBe(40);
  });

  it('undo across attempt boundary: reverses the bust dart', () => {
    // Throw T60 (bust, attempt 1 ends) then undo → back in attempt 1 with 0 darts
    const cfg: CheckoutConfig = { ...ONE_FINISH, finishes: [40] };
    const seeds = makeSeeds(seededIds(2));
    const { state } = run(cfg, [throwDart('T', 60), undoAction()], seeds);
    expect(state.currentAttemptInFinish).toBe(0);
    expect(state.dartsInCurrentAttempt).toBe(0);
    expect(state.attempts).toHaveLength(0);
  });

  it('undo after all attempts on first finish: goes back to last dart of attempt 2', () => {
    // 3 misses (attempt 1 ends), then undo → back at dart 2 of attempt 1
    const seeds = makeSeeds(seededIds(4));
    const { state } = run(
      ONE_FINISH,
      [
        throwDart('MISS', 0), throwDart('MISS', 0), throwDart('MISS', 0), // attempt 1 ends
        undoAction() // undo 3rd MISS → back at dart 2 of attempt 1
      ],
      seeds
    );
    expect(state.currentAttemptInFinish).toBe(0);
    expect(state.dartsInCurrentAttempt).toBe(2);
    expect(state.attempts).toHaveLength(0);
  });

  it('undo after checkout restores in-progress state', () => {
    const seeds = makeSeeds(seededIds(2));
    const { state } = run(ONE_FINISH, [throwDart('D', 40), undoAction()], seeds);
    expect(state.status).toBe('in_progress');
    expect(state.currentFinishIndex).toBe(0);
    expect(state.attempts).toHaveLength(0);
  });

  it('undo pops event id from emitted log', () => {
    const ids = seededIds(2);
    const seeds = makeSeeds(ids);
    const { emitted } = run(ONE_FINISH, [throwDart('MISS', 0), undoAction()], seeds);
    expect(emitted).toHaveLength(0);
  });
});

// ── forfeit ───────────────────────────────────────────────────────────────────

describe('checkoutEngine.reduce — forfeit', () => {
  it('forfeit transitions status to forfeited', () => {
    const seeds = makeSeeds(seededIds(1));
    const { state } = run(ONE_FINISH, [forfeitAction()], seeds);
    expect(state.status).toBe('forfeited');
    expect(checkoutEngine.isSessionOver(state)).toEqual({ status: 'forfeited' });
  });

  it('throws after forfeit return session_forfeited error', () => {
    const seeds = makeSeeds(seededIds(2));
    const { errors } = run(ONE_FINISH, [forfeitAction(), throwDart('D', 40)], seeds);
    expect(errors[1]).toBe('session_forfeited');
  });

  it('undo after forfeit returns to in_progress', () => {
    const seeds = makeSeeds(seededIds(2));
    const { state } = run(ONE_FINISH, [forfeitAction(), undoAction()], seeds);
    expect(state.status).toBe('in_progress');
  });
});

// ── invalid actions ───────────────────────────────────────────────────────────

describe('checkoutEngine.reduce — invalid actions', () => {
  it('unknown participant returns error without mutating state', () => {
    const s = checkoutEngine.init(ONE_FINISH, [P1], SESSION, makeSeeds([]));
    const r = checkoutEngine.reduce(
      s,
      { type: 'throw', participantId: 'UNKNOWN', segment: 'D', value: 40 },
      makeSeeds(seededIds(1))
    );
    expect(r.error?.code).toBe('unknown_participant');
    expect(r.state).toBe(s);
  });

  it('throws after session_completed return error', () => {
    const cfg: CheckoutConfig = { ...ONE_FINISH, attemptsPerFinish: 1 };
    const seeds = makeSeeds(seededIds(2));
    const { errors } = run(cfg, [throwDart('D', 40), throwDart('D', 40)], seeds);
    expect(errors[1]).toBe('session_completed');
  });

  it('empty note returns error', () => {
    const s = checkoutEngine.init(ONE_FINISH, [P1], SESSION, makeSeeds([]));
    const r = checkoutEngine.reduce(s, { type: 'note', text: '  ' }, makeSeeds(seededIds(1)));
    expect(r.error?.code).toBe('empty_note');
  });
});

// ── replay equivalence ────────────────────────────────────────────────────────

describe('checkoutEngine.replay', () => {
  it('replay(events) produces state equal to live reduction', () => {
    const actions: CheckoutAction[] = [
      throwDart('MISS', 0),
      throwDart('S', 10),
      throwDart('MISS', 0), // attempt 1 done (3 darts)
      throwDart('D', 40)    // attempt 2: checkout
    ];
    const seeds = makeSeeds(seededIds(actions.length));
    const { state: liveState, emitted } = run(ONE_FINISH, actions, seeds);

    const replayedState = checkoutEngine.replay(emitted as never, ONE_FINISH, [P1], SESSION);

    expect(replayedState.status).toEqual(liveState.status);
    expect(replayedState.currentFinishIndex).toEqual(liveState.currentFinishIndex);
    expect(replayedState.attempts.length).toEqual(liveState.attempts.length);
    expect(replayedState.attempts[0]!.success).toBe(false);
    expect(replayedState.attempts[1]!.success).toBe(true);
  });

  it('replay with forfeit produces forfeited status', () => {
    const actions: CheckoutAction[] = [throwDart('MISS', 0), forfeitAction()];
    const seeds = makeSeeds(seededIds(2));
    const { emitted } = run(ONE_FINISH, actions, seeds);
    const replayedState = checkoutEngine.replay(emitted as never, ONE_FINISH, [P1], SESSION);
    expect(replayedState.status).toBe('forfeited');
  });
});

// ── seededShuffle determinism ─────────────────────────────────────────────────

describe('seededShuffle', () => {
  it('produces deterministic output for the same seed', () => {
    const result1 = seededShuffle([40, 32, 20, 10, 2], 'test-seed');
    const result2 = seededShuffle([40, 32, 20, 10, 2], 'test-seed');
    expect(result1).toEqual(result2);
  });

  it('preserves all elements', () => {
    const original = [170, 167, 100, 40, 2];
    const shuffled = seededShuffle(original, 'abc');
    expect(shuffled.slice().sort((a, b) => a - b)).toEqual(original.slice().sort((a, b) => a - b));
  });

  it('does not mutate the input array', () => {
    const original = [40, 32, 20];
    const copy = [...original];
    seededShuffle(original, 'seed');
    expect(original).toEqual(copy);
  });

  it('random mode uses orderedFinishes as play sequence', () => {
    const cfg: CheckoutConfig = {
      mode: 'random',
      finishes: [40, 32, 20],
      attemptsPerFinish: 1,
      outRule: 'double',
      orderedFinishes: [20, 40, 32]
    };
    const s = checkoutEngine.init(cfg, [P1], SESSION, makeSeeds([]));
    expect(s.orderedFinishes).toEqual([20, 40, 32]);
    expect(s.remainingInCurrentAttempt).toBe(20); // first in shuffled order
  });
});

// ── view ──────────────────────────────────────────────────────────────────────

describe('checkoutEngine.view', () => {
  it('view reflects current finish and attempt info', () => {
    const s = checkoutEngine.init(TWO_FINISH, [P1], SESSION, makeSeeds([]));
    const v = checkoutEngine.view(s);
    expect(v.currentFinish).toBe(40);
    expect(v.currentFinishIndex).toBe(0);
    expect(v.totalFinishes).toBe(2);
    expect(v.currentAttempt).toBe(1);
    expect(v.totalAttempts).toBe(2);
    expect(v.successCount).toBe(0);
    expect(v.successRate).toBeNull();
    expect(v.canUndo).toBe(false);
  });

  it('view successRate updates after attempts', () => {
    const seeds = makeSeeds(seededIds(4));
    const { state } = run(ONE_FINISH, [
      throwDart('D', 40), // attempt 1: success
      throwDart('D', 40)  // attempt 2 of 2: success again (still on same finish? No, attempt 1 succeeded, finish 40 done, but we only have 1 finish → completed)
    ], seeds);
    // After 1 success on 1 finish, session is completed
    const v = checkoutEngine.view(state);
    expect(v.successCount).toBe(1);
    expect(v.successRate).toBe(100);
  });

  it('view canUndo is true after any throw', () => {
    const seeds = makeSeeds(seededIds(1));
    let s = checkoutEngine.init(ONE_FINISH, [P1], SESSION, makeSeeds([]));
    const r = checkoutEngine.reduce(s, throwDart('MISS', 0), seeds);
    s = r.state;
    expect(checkoutEngine.view(s).canUndo).toBe(true);
  });
});

// ── default config ────────────────────────────────────────────────────────────

describe('CHECKOUT_DEFAULT_CONFIG', () => {
  it('default config has finishes, attemptsPerFinish, and outRule', () => {
    expect(CHECKOUT_DEFAULT_CONFIG.finishes.length).toBeGreaterThan(0);
    expect(CHECKOUT_DEFAULT_CONFIG.attemptsPerFinish).toBeGreaterThanOrEqual(1);
    expect(CHECKOUT_DEFAULT_CONFIG.outRule).toBe('double');
  });

  it('engine initialises with default config without error', () => {
    expect(() =>
      checkoutEngine.init(CHECKOUT_DEFAULT_CONFIG, [P1], SESSION, makeSeeds([]))
    ).not.toThrow();
  });
});
