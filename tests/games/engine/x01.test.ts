import { describe, expect, it } from 'vitest';
import type { EngineSeeds } from '@/games/engine';
import type { X01Action, X01Config, X01State } from '@/games/x01';
import { X01_DEFAULT_CONFIG, x01Engine } from '@/games/x01';

const SESSION = '01JARVQZSSSSSSSSSSSSSSSSSS';
const P1 = '01JARVQZPPPPPPPPPPPPPPPPPP';
const P2 = '01JARVQZQQQQQQQQQQQQQQQQQQ';
const NOW = '2026-04-18T12:00:00.000Z';

function seededIds(count: number, seed = 1): string[] {
  let x = seed;
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out.push(('01JARVQZ00000000' + x.toString(36).toUpperCase().padStart(10, '0')).slice(0, 26));
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

type TestConfig = Omit<Partial<X01Config>, 'startScore'> & { startScore?: number };

function init(config: TestConfig = {}, participants: string[] = [P1]): X01State {
  const cfg = { ...X01_DEFAULT_CONFIG, ...config } as X01Config;
  return x01Engine.init(cfg, participants, SESSION, makeSeeds([]));
}

function run(
  state: X01State,
  actions: X01Action[],
  seeds: EngineSeeds
): { state: X01State; events: Array<{ id: string }>; errors: Array<string | undefined> } {
  const events: Array<{ id: string }> = [];
  const errors: Array<string | undefined> = [];
  let s = state;
  for (const a of actions) {
    const r = x01Engine.reduce(s, a, seeds);
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

function throwAction(segment: X01Action & { type: 'throw' }): X01Action {
  return segment;
}

function t(segment: 'S' | 'D' | 'T', face: number, participantId = P1): X01Action {
  const mult = segment === 'S' ? 1 : segment === 'D' ? 2 : 3;
  return { type: 'throw', participantId, segment, value: face * mult };
}
function sb(participantId = P1): X01Action {
  return { type: 'throw', participantId, segment: 'SB', value: 25 };
}
function db(participantId = P1): X01Action {
  return { type: 'throw', participantId, segment: 'DB', value: 50 };
}
function miss(participantId = P1): X01Action {
  return { type: 'throw', participantId, segment: 'MISS', value: 0 };
}

describe('x01Engine.init', () => {
  it('starts at the configured start score with an unopened straight-in player', () => {
    const s = init({ startScore: 501, inRule: 'straight' });
    expect(s.status).toBe('in_progress');
    expect(s.legs).toEqual([]);
    expect(s.legsWon[P1]).toBe(0);
    const v = x01Engine.view(s);
    expect(v.remaining).toBe(501);
    expect(v.opened).toBe(true);
    expect(v.activeParticipantId).toBe(P1);
  });

  it('starts closed when inRule is double-in', () => {
    const s = init({ startScore: 301, inRule: 'double' });
    expect(x01Engine.view(s).opened).toBe(false);
  });
});

describe('x01Engine.reduce — basic scoring + auto turn close', () => {
  it('decrements remaining, auto-closes after 3 darts, rotates back to same player in single-player', () => {
    const s0 = init({ startScore: 501 });
    const seeds = makeSeeds(seededIds(10, 1));
    const { state, events } = run(s0, [t('T', 20), t('T', 20), t('S', 20)], seeds);
    expect(events).toHaveLength(3);
    const v = x01Engine.view(state);
    expect(v.remaining).toBe(501 - 60 - 60 - 20);
    expect(v.currentTurn.darts).toHaveLength(0);
    expect(v.lastClosedTurn?.scored).toBe(140);
    expect(v.legStats.threeDartAvg).toBeCloseTo(140);
  });

  it('tracks dart-by-dart inside an open turn', () => {
    const seeds = makeSeeds(seededIds(5, 2));
    const { state } = run(init(), [t('T', 20)], seeds);
    const v = x01Engine.view(state);
    expect(v.currentTurn.darts).toHaveLength(1);
    expect(v.currentTurn.scored).toBe(60);
    expect(v.remaining).toBe(441);
  });

  it('rejects throws from the wrong participant', () => {
    const seeds = makeSeeds(seededIds(5, 3));
    const s0 = init({}, [P1, P2]);
    const { errors } = run(s0, [t('S', 20, P2)], seeds);
    expect(errors[0]).toBe('wrong_turn');
  });

  it('rejects invalid dart values', () => {
    const seeds = makeSeeds(seededIds(5, 4));
    const { errors } = run(init(), [{ type: 'throw', participantId: P1, segment: 'T', value: 7 }], seeds);
    expect(errors[0]).toBe('invalid_dart');
  });
});

describe('x01Engine — bust rules', () => {
  it('busts when going below zero and reverts remaining to turn start', () => {
    // from 40 remaining: T20 (60) must bust.
    const start = init({ startScore: 40, outRule: 'double' });
    const seeds = makeSeeds(seededIds(10, 5));
    const { state } = run(start, [t('T', 20)], seeds);
    const v = x01Engine.view(state);
    expect(v.lastClosedTurn?.bust).toBe(true);
    expect(v.remaining).toBe(40);
  });

  it('busts when leaving exactly 1 under double-out', () => {
    // from 3 remaining, S2 leaves 1 → bust.
    const start = init({ startScore: 3, outRule: 'double' });
    const seeds = makeSeeds(seededIds(5, 6));
    const { state } = run(start, [t('S', 2)], seeds);
    expect(x01Engine.view(state).lastClosedTurn?.bust).toBe(true);
  });

  it('does not bust on leaving 1 under straight-out', () => {
    const start = init({ startScore: 3, outRule: 'straight' });
    const seeds = makeSeeds(seededIds(5, 7));
    const { state } = run(start, [t('S', 2), t('S', 1)], seeds);
    const v = x01Engine.view(state);
    expect(v.remaining).toBe(0);
    expect(v.status).toBe('completed');
  });

  it('busts when hitting zero on a single under double-out', () => {
    const start = init({ startScore: 40, outRule: 'double' });
    const seeds = makeSeeds(seededIds(10, 8));
    // from 40: S20 leaves 20 (fine), then S20 leaves 0 but not a double → bust.
    const { state } = run(start, [t('S', 20), t('S', 20)], seeds);
    const v = x01Engine.view(state);
    expect(v.lastClosedTurn?.bust).toBe(true);
    expect(v.remaining).toBe(40);
  });

  it('busts mid-turn but discards later darts', () => {
    // With double-out from 40, first dart T20 (60) busts; a follow-up throw is blocked by turn close.
    const start = init({ startScore: 40, outRule: 'double' });
    const seeds = makeSeeds(seededIds(5, 9));
    const r = x01Engine.reduce(start, t('T', 20), seeds);
    expect(r.state.legs.at(-1)?.turns.at(-1)?.bust).toBe(true);
    expect(r.state.legs.at(-1)?.turns.at(-1)?.closed).toBe(true);
  });
});

describe('x01Engine — checkout rules', () => {
  it('finishes a leg on D20 from 40 under double-out', () => {
    const start = init({ startScore: 40, outRule: 'double' });
    const seeds = makeSeeds(seededIds(5, 10));
    const { state } = run(start, [t('D', 20)], seeds);
    const v = x01Engine.view(state);
    expect(v.status).toBe('completed');
    expect(v.winnerParticipantId).toBe(P1);
    expect(v.legStats.highestFinish).toBe(40);
  });

  it('rejects finishes that do not satisfy double-out', () => {
    const start = init({ startScore: 2, outRule: 'double' });
    const seeds = makeSeeds(seededIds(5, 11));
    // S2 from 2 → 0 on a single → bust under double-out.
    const { state } = run(start, [t('S', 2)], seeds);
    expect(x01Engine.view(state).status).toBe('in_progress');
    expect(x01Engine.view(state).lastClosedTurn?.bust).toBe(true);
  });

  it('accepts any finish under straight-out', () => {
    const start = init({ startScore: 5, outRule: 'straight' });
    const seeds = makeSeeds(seededIds(5, 12));
    const { state } = run(start, [t('S', 5)], seeds);
    expect(x01Engine.view(state).status).toBe('completed');
  });

  it('masters-out accepts T but rejects S', () => {
    const start = init({ startScore: 9, outRule: 'masters' });
    const seeds = makeSeeds(seededIds(5, 13));
    const { state } = run(start, [t('T', 3)], seeds);
    expect(x01Engine.view(state).status).toBe('completed');

    const start2 = init({ startScore: 9, outRule: 'masters' });
    const { state: s2 } = run(start2, [t('S', 9)], makeSeeds(seededIds(5, 14)));
    expect(x01Engine.view(s2).status).toBe('in_progress');
    expect(x01Engine.view(s2).lastClosedTurn?.bust).toBe(true);
  });

  it('double-in ignores non-double darts until the first double', () => {
    const start = init({ startScore: 50, inRule: 'double', outRule: 'double' });
    const seeds = makeSeeds(seededIds(20, 15));
    // Turn 1: S20, S20, S20 — all ignored, no score.
    const { state } = run(start, [t('S', 20), t('S', 20), t('S', 20)], seeds);
    const v = x01Engine.view(state);
    expect(v.remaining).toBe(50);
    expect(v.lastClosedTurn?.scored).toBe(0);
  });

  it('double-in opens on a D20 and allows scoring afterwards', () => {
    const start = init({ startScore: 100, inRule: 'double', outRule: 'double' });
    const seeds = makeSeeds(seededIds(20, 16));
    const { state } = run(start, [t('D', 20), t('S', 20), t('S', 20)], seeds);
    const v = x01Engine.view(state);
    expect(v.remaining).toBe(100 - 40 - 20 - 20);
    expect(v.opened).toBe(true);
  });
});

describe('x01Engine — legs + match progression', () => {
  it('resets remaining for a new leg after a checkout', () => {
    const start = init({ startScore: 40, outRule: 'double', legsToWin: 2 });
    const seeds = makeSeeds(seededIds(20, 17));
    const { state } = run(start, [t('D', 20)], seeds);
    const v = x01Engine.view(state);
    expect(v.legsWon[P1]).toBe(1);
    expect(v.status).toBe('in_progress');
    expect(v.legIndex).toBe(1);
    expect(v.remaining).toBe(40);
  });

  it('emits throws for the next leg when one leg has just finished', () => {
    const start = init({ startScore: 40, outRule: 'double', legsToWin: 2 });
    const seeds = makeSeeds(seededIds(20, 171));
    const { state } = run(start, [t('D', 20), t('S', 20)], seeds);
    const v = x01Engine.view(state);
    expect(v.legIndex).toBe(1);
    expect(v.remaining).toBe(20);
    expect(v.currentTurn.darts).toHaveLength(1);
  });

  it('completes session when legsToWin is reached', () => {
    const start = init({ startScore: 40, outRule: 'double', legsToWin: 1 });
    const seeds = makeSeeds(seededIds(10, 18));
    const { state } = run(start, [t('D', 20)], seeds);
    expect(x01Engine.view(state).status).toBe('completed');
  });
});

describe('x01Engine — undo and forfeit', () => {
  it('undo walks back through turn and leg boundaries', () => {
    const start = init({ startScore: 40, outRule: 'double', legsToWin: 2 });
    const seeds = makeSeeds(seededIds(20, 19));
    const { state, events } = run(
      start,
      [t('D', 20), t('T', 20), t('T', 20), t('S', 20)],
      seeds
    );
    // After: leg 0 won, mid-turn in leg 1 with 140 scored.
    let s = state;
    for (let i = 0; i < events.length; i += 1) {
      const r = x01Engine.reduce(s, { type: 'undo' }, seeds);
      expect(r.error).toBeUndefined();
      s = r.state;
    }
    const v = x01Engine.view(s);
    expect(v.remaining).toBe(40);
    expect(v.legsWon[P1]).toBe(0);
    expect(v.canUndo).toBe(false);
  });

  it('forfeit transitions to forfeited and blocks throws until undone', () => {
    const seeds = makeSeeds(seededIds(10, 20));
    const start = init({ startScore: 501 });
    const r1 = x01Engine.reduce(start, { type: 'forfeit', participantId: P1 }, seeds);
    expect(r1.state.status).toBe('forfeited');
    const r2 = x01Engine.reduce(r1.state, t('S', 20), seeds);
    expect(r2.error?.code).toBe('session_forfeited');
    const r3 = x01Engine.reduce(r1.state, { type: 'undo' }, seeds);
    expect(r3.state.status).toBe('in_progress');
  });
});

describe('x01Engine property: replay(events) == reduce accumulation', () => {
  const actionsForSeed = (seed: number): X01Action[] => {
    let x = seed || 1;
    const rand = () => {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x / 0x7fffffff;
    };
    const out: X01Action[] = [];
    const n = 40 + Math.floor(rand() * 20);
    for (let i = 0; i < n; i += 1) {
      const roll = rand();
      if (roll < 0.9) {
        const face = 1 + Math.floor(rand() * 20);
        const mult = rand() < 0.33 ? 'S' : rand() < 0.5 ? 'D' : 'T';
        out.push(throwAction({
          type: 'throw',
          participantId: P1,
          segment: mult,
          value: face * (mult === 'S' ? 1 : mult === 'D' ? 2 : 3)
        }));
      } else if (roll < 0.95) {
        out.push(rand() < 0.5 ? sb() : db());
      } else if (roll < 0.97) {
        out.push(miss());
      } else {
        out.push({ type: 'undo' });
      }
    }
    return out;
  };

  for (const seed of [1, 2, 5, 13, 42, 99, 314]) {
    it(`seed ${seed}: replay matches reduce`, () => {
      const seeds = makeSeeds(seededIds(500, seed));
      const start = init({ startScore: 501, outRule: 'double' });
      const { state, events } = run(start, actionsForSeed(seed), seeds);
      const replayed = x01Engine.replay(
        events as unknown as import('@/domain/types').GameEvent[],
        state.config,
        state.participantIds,
        SESSION
      );
      expect(replayed.status).toBe(state.status);
      expect(replayed.legs.length).toBe(state.legs.length);
      expect(replayed.legsWon).toEqual(state.legsWon);
      expect(x01Engine.view(replayed).remaining).toBe(x01Engine.view(state).remaining);
      expect(x01Engine.view(replayed).currentTurn.darts.length).toBe(
        x01Engine.view(state).currentTurn.darts.length
      );
    });
  }
});
