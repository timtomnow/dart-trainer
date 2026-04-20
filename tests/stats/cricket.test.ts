import { describe, expect, it } from 'vitest';
import type { GameEvent } from '@/domain/types';
import { CRICKET_DEFAULT_CONFIG, cricketEngine, type CricketAction } from '@/games/cricket';
import type { EngineSeeds } from '@/games/engine';
import { computeCricketStats } from '@/stats/cricketStats';

const SESSION_ID = '01JBCRICKETS000000000000000';
const P1 = '01JBCRICKETP100000000000000';
const NOW_BASE = '2026-04-19T12:00:00.000Z';
const NOW_END = '2026-04-19T12:05:00.000Z';

const SESSION_SHAPE = {
  id: SESSION_ID,
  participants: [P1],
  startedAt: NOW_BASE
};

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
    now: () => NOW_END,
    newId: () => {
      const r = iter.next();
      if (r.done) throw new Error('ran out of ids');
      return r.value;
    }
  };
}

function runActions(actions: CricketAction[]): GameEvent[] {
  const seeds = makeSeeds(seededIds(actions.length * 2));
  let state = cricketEngine.init(CRICKET_DEFAULT_CONFIG, [P1], SESSION_ID, makeSeeds([]));
  const events: GameEvent[] = [];
  for (const a of actions) {
    const r = cricketEngine.reduce(state, a, seeds);
    if (!r.error) {
      state = r.state;
      events.push(...r.emit);
    }
  }
  return events;
}

function T(face: number): CricketAction {
  return { type: 'throw', participantId: P1, segment: 'T', value: face * 3 };
}
function miss(): CricketAction {
  return { type: 'throw', participantId: P1, segment: 'MISS', value: 0 };
}
function db(): CricketAction {
  return { type: 'throw', participantId: P1, segment: 'DB', value: 50 };
}
function sb(): CricketAction {
  return { type: 'throw', participantId: P1, segment: 'SB', value: 25 };
}

describe('computeCricketStats — fixture: close all targets with triples', () => {
  // Sequence: for each of 15-20 + bull, one turn that closes the target
  // T15, miss, miss (turn 1) → 3 marks on 15 → 0 score (single player, target dead)
  // ... same for 16-20
  // DB, SB, miss → 3 bull marks
  // Total turns = 7 (all closed). Total marks = 7 × 3 = 21. MPR = 21/7 = 3.0.

  function buildActions(): CricketAction[] {
    const targets = [15, 16, 17, 18, 19, 20] as const;
    const actions: CricketAction[] = [];
    for (const t of targets) {
      actions.push(T(t), miss(), miss());
    }
    // Bull: DB (2) + SB (1) = 3 marks
    actions.push(db(), sb(), miss());
    return actions;
  }

  it('computes totalMarks = 21 for 7 closed-target turns', () => {
    const events = runActions(buildActions());
    const stats = computeCricketStats(events, CRICKET_DEFAULT_CONFIG, SESSION_SHAPE);
    expect(stats.totalMarks).toBe(21);
  });

  it('computes marksPerRound = 3.0', () => {
    const events = runActions(buildActions());
    const stats = computeCricketStats(events, CRICKET_DEFAULT_CONFIG, SESSION_SHAPE);
    expect(stats.marksPerRound).toBeCloseTo(3.0, 5);
  });

  it('dartsThrown = 20 (3 darts × 6 turns + 2 darts on winning bull turn)', () => {
    // The session ends on the SB dart that closes bull — the final miss is never thrown.
    const events = runActions(buildActions());
    const stats = computeCricketStats(events, CRICKET_DEFAULT_CONFIG, SESSION_SHAPE);
    expect(stats.dartsThrown).toBe(20);
  });

  it('totalScored = 0 (single player — no opponents to score against)', () => {
    const events = runActions(buildActions());
    const stats = computeCricketStats(events, CRICKET_DEFAULT_CONFIG, SESSION_SHAPE);
    expect(stats.totalScored).toBe(0);
  });

  it('durationMs is non-negative', () => {
    const events = runActions(buildActions());
    const stats = computeCricketStats(events, CRICKET_DEFAULT_CONFIG, SESSION_SHAPE);
    expect(stats.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('computeCricketStats — empty session', () => {
  it('returns zeros for empty event list', () => {
    const stats = computeCricketStats([], CRICKET_DEFAULT_CONFIG, SESSION_SHAPE);
    expect(stats.totalMarks).toBe(0);
    expect(stats.marksPerRound).toBe(0);
    expect(stats.dartsThrown).toBe(0);
    expect(stats.durationMs).toBe(0);
  });
});

describe('computeCricketStats — partial session (no closed turns)', () => {
  it('marksPerRound = 0 when no turns are closed yet', () => {
    // One dart only — turn not yet closed
    const events = runActions([T(20)]);
    const stats = computeCricketStats(events, CRICKET_DEFAULT_CONFIG, SESSION_SHAPE);
    expect(stats.marksPerRound).toBe(0);
    expect(stats.totalMarks).toBe(0);
  });
});
