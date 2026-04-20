import { describe, expect, it } from 'vitest';
import type { CricketAction, CricketConfig, CricketState } from '@/games/cricket';
import { CRICKET_DEFAULT_CONFIG, cricketEngine } from '@/games/cricket';
import type { EngineSeeds } from '@/games/engine';

const SESSION = '01JBCRICKETS000000000000000';
const P1 = '01JBCRICKETP100000000000000';
const P2 = '01JBCRICKETP200000000000000';
const NOW = '2026-04-19T12:00:00.000Z';

function seededIds(count: number, seed = 1): string[] {
  let x = seed;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out.push(('01JBCRICKETE0000' + x.toString(36).toUpperCase().padStart(10, '0')).slice(0, 26));
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

function init(
  config: Partial<CricketConfig> = {},
  participants: string[] = [P1]
): CricketState {
  const cfg: CricketConfig = { ...CRICKET_DEFAULT_CONFIG, ...config };
  return cricketEngine.init(cfg, participants, SESSION, makeSeeds([]));
}

function run(
  state: CricketState,
  actions: CricketAction[],
  seeds: EngineSeeds
): { state: CricketState; events: Array<{ id: string }>; errors: Array<string | undefined> } {
  const events: Array<{ id: string }> = [];
  const errors: Array<string | undefined> = [];
  let s = state;
  for (const a of actions) {
    const r = cricketEngine.reduce(s, a, seeds);
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

function T(face: number, pid = P1): CricketAction {
  return { type: 'throw', participantId: pid, segment: 'T', value: face * 3 };
}
function D(face: number, pid = P1): CricketAction {
  return { type: 'throw', participantId: pid, segment: 'D', value: face * 2 };
}
function S(face: number, pid = P1): CricketAction {
  return { type: 'throw', participantId: pid, segment: 'S', value: face };
}
function miss(pid = P1): CricketAction {
  return { type: 'throw', participantId: pid, segment: 'MISS', value: 0 };
}
function db(pid = P1): CricketAction {
  return { type: 'throw', participantId: pid, segment: 'DB', value: 50 };
}
function sb(pid = P1): CricketAction {
  return { type: 'throw', participantId: pid, segment: 'SB', value: 25 };
}
function undo(): CricketAction {
  return { type: 'undo' };
}

// ── init ─────────────────────────────────────────────────────────────────────

describe('cricketEngine.init', () => {
  it('starts in_progress with empty marks and zero score', () => {
    const s = init();
    expect(s.status).toBe('in_progress');
    expect(s.legs).toHaveLength(0);
    expect(s.legsWon[P1]).toBe(0);
    const v = cricketEngine.view(s);
    expect(v.marks[P1]).toEqual({ 15: 0, 16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 25: 0 });
    expect(v.score[P1]).toBe(0);
    expect(v.canUndo).toBe(false);
  });

  it('activeParticipantId is the first participant', () => {
    const s = init({}, [P1, P2]);
    expect(cricketEngine.view(s).activeParticipantId).toBe(P1);
  });
});

// ── mark counting ─────────────────────────────────────────────────────────────

describe('cricketEngine.reduce — mark counting', () => {
  it('single gives 1 mark', () => {
    const s0 = init();
    const { state } = run(s0, [S(20)], makeSeeds(seededIds(1)));
    const v = cricketEngine.view(state);
    expect(v.marks[P1]![20]).toBe(1);
    expect(v.score[P1]).toBe(0);
  });

  it('double gives 2 marks', () => {
    const s0 = init();
    const { state } = run(s0, [D(20)], makeSeeds(seededIds(1)));
    expect(cricketEngine.view(state).marks[P1]![20]).toBe(2);
  });

  it('triple closes a target in one dart', () => {
    const s0 = init();
    const { state } = run(s0, [T(20)], makeSeeds(seededIds(1)));
    expect(cricketEngine.view(state).marks[P1]![20]).toBe(3);
  });

  it('non-cricket number gives 0 marks (S14)', () => {
    const s0 = init();
    const { state } = run(s0, [S(14)], makeSeeds(seededIds(1)));
    const v = cricketEngine.view(state);
    expect(v.marks[P1]![14]).toBeUndefined();
    expect(v.currentTurn.marked).toBe(0);
  });

  it('MISS gives 0 marks', () => {
    const s0 = init();
    const { state } = run(s0, [miss()], makeSeeds(seededIds(1)));
    expect(cricketEngine.view(state).currentTurn.marked).toBe(0);
  });

  it('SB gives 1 bull mark, DB gives 2 bull marks', () => {
    const s0 = init();
    const { state: s1 } = run(s0, [sb()], makeSeeds(seededIds(1)));
    expect(cricketEngine.view(s1).marks[P1]![25]).toBe(1);

    const s0b = init();
    const { state: s2 } = run(s0b, [db()], makeSeeds(seededIds(1)));
    expect(cricketEngine.view(s2).marks[P1]![25]).toBe(2);
  });

  it('marks cap at 3 on the scoreboard', () => {
    const s0 = init();
    const ids = seededIds(4);
    const seeds = makeSeeds(ids);
    // T20 closes it, then S20 should not go above 3
    const { state } = run(s0, [T(20), S(20)], seeds);
    expect(cricketEngine.view(state).marks[P1]![20]).toBe(3);
  });
});

// ── scoring ───────────────────────────────────────────────────────────────────

describe('cricketEngine.reduce — scoring', () => {
  it('no points until target is closed (single-player)', () => {
    const s0 = init();
    const seeds = makeSeeds(seededIds(3));
    // D20 = 2 marks, still 1 short of closed
    const { state } = run(s0, [D(20), S(20)], seeds);
    // Now closed with 3 marks total — no excess yet
    expect(cricketEngine.view(state).score[P1]).toBe(0);
  });

  it('scores excess marks × face value after closing (single-player)', () => {
    const s0 = init();
    const seeds = makeSeeds(seededIds(5));
    // T20 closes (3 marks). Then T20 again = 3 excess marks on closed target.
    // But in single-player there are no opponents, so all targets are "already dead"
    // once the only player closes them. Score should be 0 (no opponents to score against).
    const { state } = run(s0, [T(20), T(20)], seeds);
    expect(cricketEngine.view(state).score[P1]).toBe(0);
  });

  it('scores excess marks when opponent has not closed the target', () => {
    const s0 = init({}, [P1, P2]);
    const ids = seededIds(20);
    const seeds = makeSeeds(ids);
    // P1: T20 closes 20 (3 marks), then S20 = 1 excess mark = 20 pts (P2 hasn't closed)
    // P2 turn first dart only (for 3-dart rotation): 3 misses
    // Full sequence: P1 throw T20, miss, miss (turn end), P2 miss,miss,miss, P1 S20 ...
    // Simpler: use two separate turns
    const actions: CricketAction[] = [
      T(20, P1), miss(P1), miss(P1), // P1 turn: closes 20
      miss(P2), miss(P2), miss(P2),  // P2 turn: nothing
      S(20, P1), miss(P1), miss(P1)  // P1 turn: 1 excess mark on 20 = 20 pts
    ];
    const { state } = run(s0, actions, seeds);
    expect(cricketEngine.view(state).score[P1]).toBe(20);
  });

  it('stops scoring when all players have closed the target', () => {
    const s0 = init({}, [P1, P2]);
    const ids = seededIds(30);
    const seeds = makeSeeds(ids);
    const actions: CricketAction[] = [
      T(20, P1), miss(P1), miss(P1), // P1 closes 20
      T(20, P2), miss(P2), miss(P2), // P2 closes 20 — target now dead
      S(20, P1), miss(P1), miss(P1)  // P1 extra mark on dead target — no points
    ];
    const { state } = run(s0, actions, seeds);
    expect(cricketEngine.view(state).score[P1]).toBe(0);
  });

  it('bull scoring: DB closes (2 marks), third mark scores 25', () => {
    const s0 = init({}, [P1, P2]);
    const ids = seededIds(20);
    const seeds = makeSeeds(ids);
    const actions: CricketAction[] = [
      sb(P1), miss(P1), miss(P1),  // P1: 1 bull mark
      miss(P2), miss(P2), miss(P2),
      db(P1), miss(P1), miss(P1),  // P1: 2 more = closes (3 marks)
      miss(P2), miss(P2), miss(P2),
      sb(P1), miss(P1), miss(P1)   // P1: 1 excess mark × 25 = 25 pts
    ];
    const { state } = run(s0, actions, seeds);
    expect(cricketEngine.view(state).score[P1]).toBe(25);
  });
});

// ── turn auto-close ───────────────────────────────────────────────────────────

describe('cricketEngine.reduce — turn management', () => {
  it('auto-closes turn after 3 darts and rotates to next participant', () => {
    const s0 = init({}, [P1, P2]);
    const seeds = makeSeeds(seededIds(3));
    const { state } = run(s0, [miss(P1), miss(P1), miss(P1)], seeds);
    expect(cricketEngine.view(state).activeParticipantId).toBe(P2);
  });

  it('after 3 darts for each player the turn returns to P1', () => {
    const s0 = init({}, [P1, P2]);
    const seeds = makeSeeds(seededIds(6));
    const actions: CricketAction[] = [
      miss(P1), miss(P1), miss(P1),
      miss(P2), miss(P2), miss(P2)
    ];
    const { state } = run(s0, actions, seeds);
    expect(cricketEngine.view(state).activeParticipantId).toBe(P1);
  });

  it('wrong participant returns error without mutating state', () => {
    const s0 = init({}, [P1, P2]);
    const seeds = makeSeeds(seededIds(1));
    const r = cricketEngine.reduce(s0, miss(P2), seeds);
    expect(r.error?.code).toBe('wrong_turn');
    expect(r.state).toBe(s0);
    expect(r.emit).toHaveLength(0);
  });
});

// ── win condition ─────────────────────────────────────────────────────────────

describe('cricketEngine.reduce — win condition', () => {
  function closeAllSinglePlayer(): CricketAction[] {
    // Close 15-20 + bull with triples + 1 miss to fill turns
    const targets = [15, 16, 17, 18, 19, 20, 25] as const;
    const actions: CricketAction[] = [];
    for (const t of targets) {
      if (t === 25) {
        actions.push(db(P1), sb(P1), miss(P1)); // 2+1 = 3 marks
      } else {
        actions.push(T(t, P1), miss(P1), miss(P1));
      }
    }
    return actions;
  }

  it('session completes when all targets closed (single player)', () => {
    const s0 = init();
    const actions = closeAllSinglePlayer();
    const { state } = run(s0, actions, makeSeeds(seededIds(actions.length)));
    expect(state.status).toBe('completed');
    expect(state.winnerParticipantId).toBe(P1);
  });

  it('isSessionOver reflects completed state', () => {
    const s0 = init();
    const actions = closeAllSinglePlayer();
    const { state } = run(s0, actions, makeSeeds(seededIds(actions.length)));
    expect(cricketEngine.isSessionOver(state)).toEqual({ status: 'completed' });
  });

  it('isLegOver reflects winning leg', () => {
    const s0 = init();
    const actions = closeAllSinglePlayer();
    const { state } = run(s0, actions, makeSeeds(seededIds(actions.length)));
    const legResult = cricketEngine.isLegOver(state);
    expect(legResult?.winnerParticipantId).toBe(P1);
  });

  it('rejects further throws after session ends', () => {
    const s0 = init();
    const actions = closeAllSinglePlayer();
    const { state } = run(s0, actions, makeSeeds(seededIds(actions.length)));
    const r = cricketEngine.reduce(state, miss(), makeSeeds(seededIds(1)));
    expect(r.error?.code).toBe('session_completed');
  });

  it('two-player: winner needs all closed AND highest score', () => {
    const s0 = init({}, [P1, P2]);
    const ids = seededIds(200);
    const seeds = makeSeeds(ids);

    // P1 closes all targets and scores while P2 stays behind
    // Step 1: P1 close 20, score some (P2 not closed)
    // Step 2: P1 close all others
    // Full scripted sequence:
    const targets15to19 = [15, 16, 17, 18, 19] as const;
    const actions: CricketAction[] = [];

    // P1 closes 20 in turn 1; P2 does nothing
    actions.push(T(20, P1), miss(P1), miss(P1));
    actions.push(miss(P2), miss(P2), miss(P2));

    // P1 scores on 20 (P2 hasn't closed)
    actions.push(S(20, P1), miss(P1), miss(P1));
    actions.push(miss(P2), miss(P2), miss(P2));

    // P1 closes 15-19 and bull
    for (const t of targets15to19) {
      actions.push(T(t, P1), miss(P1), miss(P1));
      actions.push(miss(P2), miss(P2), miss(P2));
    }
    // bull: DB + SB
    actions.push(db(P1), sb(P1), miss(P1));
    actions.push(miss(P2), miss(P2), miss(P2));

    const { state } = run(s0, actions, seeds);
    expect(state.status).toBe('completed');
    expect(state.winnerParticipantId).toBe(P1);
  });
});

// ── undo ─────────────────────────────────────────────────────────────────────

describe('cricketEngine.reduce — undo', () => {
  it('undo reverses the last throw', () => {
    const s0 = init();
    const seeds = makeSeeds(seededIds(2));
    const { state: s1 } = run(s0, [T(20)], seeds);
    expect(cricketEngine.view(s1).marks[P1]![20]).toBe(3);

    const r2 = cricketEngine.reduce(s1, undo(), makeSeeds([]));
    expect(r2.state.inputEventLog).toHaveLength(0);
    expect(cricketEngine.view(r2.state).marks[P1]![20]).toBe(0);
  });

  it('undo on empty log returns error', () => {
    const r = cricketEngine.reduce(init(), undo(), makeSeeds([]));
    expect(r.error?.code).toBe('nothing_to_undo');
  });

  it('undo pops the last event id', () => {
    const s0 = init();
    const ids = seededIds(1);
    const seeds = makeSeeds(ids);
    const { state: s1 } = run(s0, [miss()], seeds);
    const lastId = s1.inputEventLog.at(-1)!.id;
    const r = cricketEngine.reduce(s1, undo(), makeSeeds([]));
    expect(r.pop).toContain(lastId);
    expect(r.emit).toHaveLength(0);
  });

  it('undo can reverse a forfeit', () => {
    const s0 = init();
    const seeds = makeSeeds(seededIds(2));
    const { state: s1 } = run(s0, [{ type: 'forfeit', participantId: P1 }], seeds);
    expect(s1.status).toBe('forfeited');
    const r = cricketEngine.reduce(s1, undo(), makeSeeds([]));
    expect(r.state.status).toBe('in_progress');
  });
});

// ── forfeit ───────────────────────────────────────────────────────────────────

describe('cricketEngine.reduce — forfeit', () => {
  it('forfeit sets status to forfeited', () => {
    const s0 = init();
    const seeds = makeSeeds(seededIds(1));
    const r = cricketEngine.reduce(s0, { type: 'forfeit', participantId: P1 }, seeds);
    expect(r.state.status).toBe('forfeited');
    expect(r.error).toBeUndefined();
  });

  it('further throws rejected after forfeit', () => {
    const s0 = init();
    const { state: s1 } = run(s0, [{ type: 'forfeit', participantId: P1 }], makeSeeds(seededIds(1)));
    const r = cricketEngine.reduce(s1, miss(), makeSeeds(seededIds(1)));
    expect(r.error?.code).toBe('session_forfeited');
  });
});

// ── invalid input ─────────────────────────────────────────────────────────────

describe('cricketEngine.reduce — invalid input', () => {
  it('invalid dart segment/value returns error without mutating state', () => {
    const s0 = init();
    const r = cricketEngine.reduce(
      s0,
      { type: 'throw', participantId: P1, segment: 'S', value: 999 },
      makeSeeds(seededIds(1))
    );
    expect(r.error?.code).toBe('invalid_dart');
    expect(r.state).toBe(s0);
  });

  it('unknown action returns error', () => {
    const s0 = init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = cricketEngine.reduce(s0, { type: 'bogus' } as any, makeSeeds([]));
    expect(r.error?.code).toBe('unknown_action');
  });
});

// ── replay property ───────────────────────────────────────────────────────────

describe('cricketEngine.replay — property test', () => {
  it('replay(events) equals live reduce accumulation for a complete session', () => {
    const s0 = init({}, [P1, P2]);
    const seeds = makeSeeds(seededIds(100));

    const actions: CricketAction[] = [
      // P1 closes 20, scores, then closes everything
      T(20, P1), miss(P1), miss(P1),
      miss(P2), miss(P2), miss(P2),
      S(20, P1), miss(P1), miss(P1),
      miss(P2), miss(P2), miss(P2),
      T(19, P1), T(18, P1), miss(P1),
      miss(P2), miss(P2), miss(P2),
      T(17, P1), T(16, P1), miss(P1),
      miss(P2), miss(P2), miss(P2),
      T(15, P1), miss(P1), miss(P1),
      miss(P2), miss(P2), miss(P2),
      db(P1), sb(P1), miss(P1),
      miss(P2), miss(P2), miss(P2)
    ];

    const { state: liveState, events } = run(s0, actions, seeds);

    const replayState = cricketEngine.replay(
      events as Parameters<typeof cricketEngine.replay>[0],
      CRICKET_DEFAULT_CONFIG,
      [P1, P2],
      SESSION
    );

    expect(replayState.status).toEqual(liveState.status);
    expect(replayState.winnerParticipantId).toEqual(liveState.winnerParticipantId);
    expect(replayState.legsWon).toEqual(liveState.legsWon);

    const liveView = cricketEngine.view(liveState);
    const replayView = cricketEngine.view(replayState);
    expect(replayView.marks).toEqual(liveView.marks);
    expect(replayView.score).toEqual(liveView.score);
  });

  it('replay with no events matches fresh init', () => {
    const s0 = init({}, [P1, P2]);
    const replayed = cricketEngine.replay([], CRICKET_DEFAULT_CONFIG, [P1, P2], SESSION);
    expect(replayed.status).toBe(s0.status);
    expect(replayed.legs).toHaveLength(0);
  });
});
