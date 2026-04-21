import { describe, expect, it } from 'vitest';
import type { EngineSeeds } from '@/games/engine';
import type { RtwAction, RtwConfig, RtwState } from '@/games/rtw';
import { RTW_DEFAULT_CONFIG, rtwEngine } from '@/games/rtw';

const SESSION = '01JBRTWSESSION0000000000000';
const P1 = '01JBRTWPARTICIPANT100000000';
const NOW = '2026-04-20T10:00:00.000Z';

function seededIds(count: number, seed = 1): string[] {
  let x = seed;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out.push(('01JBRTWEVE0000000' + x.toString(36).toUpperCase().padStart(9, '0')).slice(0, 26));
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

function init(config: Partial<RtwConfig> = {}): RtwState {
  const cfg: RtwConfig = { ...RTW_DEFAULT_CONFIG, ...config };
  return rtwEngine.init(cfg, [P1], SESSION, makeSeeds([]));
}

function run(
  state: RtwState,
  actions: RtwAction[],
  seeds: EngineSeeds
): { state: RtwState; events: Array<{ id: string }>; errors: Array<string | undefined> } {
  const events: Array<{ id: string }> = [];
  const errors: Array<string | undefined> = [];
  let s = state;
  for (const a of actions) {
    const r = rtwEngine.reduce(s, a, seeds);
    errors.push(r.error?.code);
    if (r.error) continue;
    for (const id of r.pop) {
      const idx = events.findIndex((e) => e.id === id);
      if (idx >= 0) events.splice(idx, 1);
    }
    for (const e of r.emit) events.push(e);
    s = r.state;
  }
  return { state: s, events, errors };
}

// Group A helpers (one dart per action)
function hit(pid = P1): RtwAction {
  return { type: 'throw', participantId: pid, hit: true };
}
function miss(pid = P1): RtwAction {
  return { type: 'throw', participantId: pid, hit: false };
}
// Group B helper (full 3-dart turn per action)
function turn(hitsInTurn: 0 | 1 | 2 | 3, pid = P1): RtwAction {
  return { type: 'throw', participantId: pid, hitsInTurn };
}
function undo(): RtwAction {
  return { type: 'undo' };
}

// ── init ──────────────────────────────────────────────────────────────────────

describe('rtwEngine.init', () => {
  it('starts in_progress at target index 0', () => {
    const s = init();
    expect(s.status).toBe('in_progress');
    expect(s.currentTargetIndex).toBe(0);
    const v = rtwEngine.view(s);
    expect(v.currentTarget).toBe(1);
    expect(v.canUndo).toBe(false);
    expect(v.targetsHit).toBe(0);
  });

  it('1-20 sequence has 21 targets with bull by default', () => {
    const s = init();
    expect(s.targetSequence).toHaveLength(21);
    expect(s.targetSequence.at(-1)).toBe(25);
  });

  it('excludeBull removes bull from sequence', () => {
    const s = init({ excludeBull: true });
    expect(s.targetSequence).toHaveLength(20);
    expect(s.targetSequence.includes(25)).toBe(false);
  });

  it('Triple gameType always excludes bull', () => {
    const s = init({ gameType: 'Triple' });
    expect(s.targetSequence.includes(25)).toBe(false);
  });

  it('20-1 order starts at 20', () => {
    const s = init({ order: '20-1', excludeBull: true });
    expect(s.targetSequence[0]).toBe(20);
    expect(s.targetSequence[19]).toBe(1);
  });

  it('Clockwise order starts at 20', () => {
    const s = init({ order: 'Clockwise', excludeBull: true });
    expect(s.targetSequence[0]).toBe(20);
    expect(s.targetSequence[1]).toBe(1);
  });

  it('Counter Clockwise order starts at 5', () => {
    const s = init({ order: 'Counter Clockwise', excludeBull: true });
    expect(s.targetSequence[0]).toBe(5);
  });
});

// ── mode: Hit once ────────────────────────────────────────────────────────────

describe('rtwEngine — mode: Hit once', () => {
  it('hit advances immediately, miss stays on same target', () => {
    const s0 = init({ mode: 'Hit once', excludeBull: true });
    // Dart 1: miss (stays on 1), Dart 2: hit (advance to 2), Dart 3: miss (stays on 2)
    const seeds = makeSeeds(seededIds(3));
    const actions: RtwAction[] = [miss(), hit(), miss()];
    const { state } = run(s0, actions, seeds);
    expect(state.currentTargetIndex).toBe(1);
    expect(rtwEngine.view(state).dartsInCurrentTurn).toBe(0); // turn closed after 3 darts
  });

  it('can advance multiple targets in one 3-dart turn', () => {
    const s0 = init({ mode: 'Hit once', excludeBull: true });
    // 3 hits in a row → advance 3 targets
    const actions: RtwAction[] = [hit(), hit(), hit()];
    const { state } = run(s0, actions, makeSeeds(seededIds(3)));
    expect(state.currentTargetIndex).toBe(3);
  });

  it('turn closes after 3 darts even if advancing', () => {
    const s0 = init({ mode: 'Hit once', excludeBull: true });
    const { state } = run(s0, [hit(), hit(), hit()], makeSeeds(seededIds(3)));
    const v = rtwEngine.view(state);
    expect(v.dartsInCurrentTurn).toBe(0);
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0]!.closed).toBe(true);
  });
});

// ── mode: 3 darts per target ──────────────────────────────────────────────────

describe('rtwEngine — mode: 3 darts per target', () => {
  it('always advances after turn regardless of hits', () => {
    const s0 = init({ mode: '3 darts per target', excludeBull: true });
    const { state } = run(s0, [turn(0)], makeSeeds(seededIds(1)));
    expect(state.currentTargetIndex).toBe(1);
  });

  it('each turn action represents 3 darts', () => {
    const s0 = init({ mode: '3 darts per target', excludeBull: true });
    const { state } = run(s0, [turn(1)], makeSeeds(seededIds(1)));
    expect(rtwEngine.view(state).totalDarts).toBe(3);
  });

  it('advances after each single turn action', () => {
    const s0 = init({ mode: '3 darts per target', excludeBull: true });
    const { state } = run(s0, [turn(0), turn(0), turn(0)], makeSeeds(seededIds(3)));
    expect(state.currentTargetIndex).toBe(3);
  });
});

// ── mode: 1-dart per target ───────────────────────────────────────────────────

describe('rtwEngine — mode: 1-dart per target', () => {
  it('advances after each single dart', () => {
    const s0 = init({ mode: '1-dart per target', excludeBull: true });
    const { state } = run(s0, [miss(), miss(), miss()], makeSeeds(seededIds(3)));
    expect(state.currentTargetIndex).toBe(3);
  });

  it('each action is 1 dart', () => {
    const s0 = init({ mode: '1-dart per target', excludeBull: true });
    const { state } = run(s0, [hit(), miss()], makeSeeds(seededIds(2)));
    expect(rtwEngine.view(state).totalDarts).toBe(2);
  });
});

// ── mode: 3-darts until hit 1 ────────────────────────────────────────────────

describe('rtwEngine — mode: 3-darts until hit 1', () => {
  it('stays on target if 0 hits in turn', () => {
    const s0 = init({ mode: '3-darts until hit 1', excludeBull: true });
    const { state } = run(s0, [turn(0)], makeSeeds(seededIds(1)));
    expect(state.currentTargetIndex).toBe(0);
  });

  it('advances if at least 1 hit in turn', () => {
    const s0 = init({ mode: '3-darts until hit 1', excludeBull: true });
    const { state } = run(s0, [turn(1)], makeSeeds(seededIds(1)));
    expect(state.currentTargetIndex).toBe(1);
  });
});

// ── mode: 3-darts until hit 2 ────────────────────────────────────────────────

describe('rtwEngine — mode: 3-darts until hit 2', () => {
  it('stays on target with only 1 hit', () => {
    const s0 = init({ mode: '3-darts until hit 2', excludeBull: true });
    const { state } = run(s0, [turn(1)], makeSeeds(seededIds(1)));
    expect(state.currentTargetIndex).toBe(0);
  });

  it('advances with 2 hits', () => {
    const s0 = init({ mode: '3-darts until hit 2', excludeBull: true });
    const { state } = run(s0, [turn(2)], makeSeeds(seededIds(1)));
    expect(state.currentTargetIndex).toBe(1);
  });
});

// ── mode: 3-darts until hit 3 ────────────────────────────────────────────────

describe('rtwEngine — mode: 3-darts until hit 3', () => {
  it('stays if only 2 hits', () => {
    const s0 = init({ mode: '3-darts until hit 3', excludeBull: true });
    const { state } = run(s0, [turn(2)], makeSeeds(seededIds(1)));
    expect(state.currentTargetIndex).toBe(0);
  });

  it('advances with all 3 hits', () => {
    const s0 = init({ mode: '3-darts until hit 3', excludeBull: true });
    const { state } = run(s0, [turn(3)], makeSeeds(seededIds(1)));
    expect(state.currentTargetIndex).toBe(1);
  });
});

// ── win condition ─────────────────────────────────────────────────────────────

describe('rtwEngine — win condition', () => {
  function completeGameGroupA(mode: 'Hit once' | '1-dart per target' = 'Hit once'): { state: RtwState; events: Array<{ id: string }> } {
    const s0 = init({ mode, excludeBull: true }); // 20 targets
    const actions: RtwAction[] = Array.from({ length: 20 }, () => hit());
    return run(s0, actions, makeSeeds(seededIds(actions.length)));
  }

  function completeGameGroupB(mode: '3 darts per target' | '3-darts until hit 1' = '3 darts per target'): { state: RtwState; events: Array<{ id: string }> } {
    const s0 = init({ mode, excludeBull: true }); // 20 targets
    const actions: RtwAction[] = Array.from({ length: 20 }, () => turn(1));
    return run(s0, actions, makeSeeds(seededIds(actions.length)));
  }

  it('status becomes completed after hitting all targets (Hit once)', () => {
    const { state } = completeGameGroupA('Hit once');
    expect(state.status).toBe('completed');
    expect(state.winnerParticipantId).toBe(P1);
  });

  it('isSessionOver reflects completed state', () => {
    const { state } = completeGameGroupA('Hit once');
    expect(rtwEngine.isSessionOver(state)).toEqual({ status: 'completed' });
  });

  it('rejects throws after session is completed', () => {
    const { state } = completeGameGroupA('Hit once');
    const r = rtwEngine.reduce(state, miss(), makeSeeds(seededIds(1)));
    expect(r.error?.code).toBe('session_completed');
  });

  it('completes with 3 darts per target mode (each turn = 3 darts)', () => {
    const { state } = completeGameGroupB('3 darts per target');
    expect(state.status).toBe('completed');
    expect(rtwEngine.view(state).totalDarts).toBe(60); // 20 targets × 3 darts
  });

  it('completes with 1-dart per target mode', () => {
    const { state } = completeGameGroupA('1-dart per target');
    expect(state.status).toBe('completed');
    expect(rtwEngine.view(state).totalDarts).toBe(20);
  });
});

// ── undo ──────────────────────────────────────────────────────────────────────

describe('rtwEngine — undo', () => {
  it('undo reverses the last throw (Group A)', () => {
    const s0 = init({ mode: 'Hit once', excludeBull: true });
    const seeds = makeSeeds(seededIds(2));
    const { state: s1 } = run(s0, [hit()], seeds);
    expect(s1.currentTargetIndex).toBe(1);

    const r2 = rtwEngine.reduce(s1, undo(), makeSeeds([]));
    expect(r2.state.currentTargetIndex).toBe(0);
    expect(r2.state.inputEventLog).toHaveLength(0);
  });

  it('undo reverses the last turn (Group B)', () => {
    const s0 = init({ mode: '3 darts per target', excludeBull: true });
    const { state: s1 } = run(s0, [turn(1)], makeSeeds(seededIds(1)));
    expect(s1.currentTargetIndex).toBe(1);

    const r2 = rtwEngine.reduce(s1, undo(), makeSeeds([]));
    expect(r2.state.currentTargetIndex).toBe(0);
    expect(r2.state.inputEventLog).toHaveLength(0);
  });

  it('undo on empty log returns error', () => {
    const r = rtwEngine.reduce(init(), undo(), makeSeeds([]));
    expect(r.error?.code).toBe('nothing_to_undo');
  });

  it('undo pops the last event id', () => {
    const s0 = init({ excludeBull: true });
    const { state: s1 } = run(s0, [miss()], makeSeeds(seededIds(1)));
    const lastId = s1.inputEventLog.at(-1)!.id;
    const r = rtwEngine.reduce(s1, undo(), makeSeeds([]));
    expect(r.pop).toContain(lastId);
    expect(r.emit).toHaveLength(0);
  });

  it('undo can cross a target boundary (reverse an advance)', () => {
    const s0 = init({ mode: 'Hit once', excludeBull: true });
    const { state: s1 } = run(s0, [hit()], makeSeeds(seededIds(1)));
    expect(s1.currentTargetIndex).toBe(1);
    const r = rtwEngine.reduce(s1, undo(), makeSeeds([]));
    expect(r.state.currentTargetIndex).toBe(0);
  });

  it('undo can reverse a forfeit', () => {
    const s0 = init({ excludeBull: true });
    const { state: s1 } = run(s0, [{ type: 'forfeit', participantId: P1 }], makeSeeds(seededIds(1)));
    expect(s1.status).toBe('forfeited');
    const r = rtwEngine.reduce(s1, undo(), makeSeeds([]));
    expect(r.state.status).toBe('in_progress');
  });
});

// ── forfeit ───────────────────────────────────────────────────────────────────

describe('rtwEngine — forfeit', () => {
  it('forfeit sets status to forfeited', () => {
    const s0 = init({ excludeBull: true });
    const r = rtwEngine.reduce(s0, { type: 'forfeit', participantId: P1 }, makeSeeds(seededIds(1)));
    expect(r.state.status).toBe('forfeited');
    expect(r.error).toBeUndefined();
  });

  it('further throws rejected after forfeit', () => {
    const s0 = init({ excludeBull: true });
    const { state: s1 } = run(s0, [{ type: 'forfeit', participantId: P1 }], makeSeeds(seededIds(1)));
    const r = rtwEngine.reduce(s1, miss(), makeSeeds(seededIds(1)));
    expect(r.error?.code).toBe('session_forfeited');
  });
});

// ── invalid input ─────────────────────────────────────────────────────────────

describe('rtwEngine — invalid input', () => {
  it('unknown action returns error', () => {
    const s0 = init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = rtwEngine.reduce(s0, { type: 'bogus' } as any, makeSeeds([]));
    expect(r.error?.code).toBe('unknown_action');
  });
});

// ── replay property ───────────────────────────────────────────────────────────

describe('rtwEngine.replay — property test', () => {
  it('replay(events) equals live reduce accumulation (Group A)', () => {
    const config: RtwConfig = { ...RTW_DEFAULT_CONFIG, mode: 'Hit once', excludeBull: true };
    const s0 = rtwEngine.init(config, [P1], SESSION, makeSeeds([]));
    const seeds = makeSeeds(seededIds(30));

    const actions: RtwAction[] = [];
    // Turns: hit → advance, miss miss
    for (let i = 0; i < 5; i++) {
      actions.push(hit(), miss(), miss()); // advance each target
    }
    // Turns with no hit
    for (let i = 0; i < 2; i++) {
      actions.push(miss(), miss(), miss());
    }
    actions.push(hit(), miss(), miss()); // advance again

    const { state: liveState, events } = run(s0, actions, seeds);

    const replayState = rtwEngine.replay(
      events as Parameters<typeof rtwEngine.replay>[0],
      config,
      [P1],
      SESSION
    );

    expect(replayState.status).toEqual(liveState.status);
    expect(replayState.currentTargetIndex).toEqual(liveState.currentTargetIndex);
    expect(replayState.winnerParticipantId).toEqual(liveState.winnerParticipantId);

    const liveView = rtwEngine.view(liveState);
    const replayView = rtwEngine.view(replayState);
    expect(replayView.targetsHit).toEqual(liveView.targetsHit);
    expect(replayView.totalDarts).toEqual(liveView.totalDarts);
  });

  it('replay(events) equals live reduce accumulation (Group B)', () => {
    const config: RtwConfig = { ...RTW_DEFAULT_CONFIG, mode: '3-darts until hit 1', excludeBull: true };
    const s0 = rtwEngine.init(config, [P1], SESSION, makeSeeds([]));
    const seeds = makeSeeds(seededIds(10));

    const actions: RtwAction[] = [
      turn(1), turn(0), turn(0), turn(2), turn(0), turn(1)
    ];

    const { state: liveState, events } = run(s0, actions, seeds);

    const replayState = rtwEngine.replay(
      events as Parameters<typeof rtwEngine.replay>[0],
      config,
      [P1],
      SESSION
    );

    expect(replayState.status).toEqual(liveState.status);
    expect(replayState.currentTargetIndex).toEqual(liveState.currentTargetIndex);

    const liveView = rtwEngine.view(liveState);
    const replayView = rtwEngine.view(replayState);
    expect(replayView.targetsHit).toEqual(liveView.targetsHit);
    expect(replayView.totalDarts).toEqual(liveView.totalDarts);
  });

  it('replay with no events matches fresh init', () => {
    const s0 = init();
    const replayed = rtwEngine.replay([], RTW_DEFAULT_CONFIG, [P1], SESSION);
    expect(replayed.status).toBe(s0.status);
    expect(replayed.currentTargetIndex).toBe(0);
    expect(replayed.turns).toHaveLength(0);
  });
});

// ── view ──────────────────────────────────────────────────────────────────────

describe('rtwEngine.view', () => {
  it('currentTarget is null when session completed', () => {
    const s0 = init({ mode: 'Hit once', excludeBull: true });
    const actions: RtwAction[] = Array.from({ length: 20 }, () => hit());
    const { state } = run(s0, actions, makeSeeds(seededIds(actions.length)));
    expect(rtwEngine.view(state).currentTarget).toBeNull();
  });

  it('targetsHit counts turns with at least one hit', () => {
    const s0 = init({ mode: '3 darts per target', excludeBull: true });
    // Turn 1: 1 hit → counts. Turn 2: 0 hits → doesn't count.
    const actions: RtwAction[] = [turn(1), turn(0)];
    const { state } = run(s0, actions, makeSeeds(seededIds(actions.length)));
    expect(rtwEngine.view(state).targetsHit).toBe(1);
  });

  it('dartsPerTurn is 1 for 1-dart per target mode', () => {
    const s0 = init({ mode: '1-dart per target', excludeBull: true });
    expect(rtwEngine.view(s0).dartsPerTurn).toBe(1);
  });

  it('dartsPerTurn is 3 for all other modes', () => {
    for (const mode of ['Hit once', '3 darts per target', '3-darts until hit 1'] as const) {
      const s0 = init({ mode, excludeBull: true });
      expect(rtwEngine.view(s0).dartsPerTurn).toBe(3);
    }
  });

  it('totalDarts counts 3 per Group B turn', () => {
    const s0 = init({ mode: '3-darts until hit 2', excludeBull: true });
    const { state } = run(s0, [turn(2), turn(2)], makeSeeds(seededIds(2)));
    expect(rtwEngine.view(state).totalDarts).toBe(6);
  });
});
