import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas';
import type { GameEvent } from '@/domain/types';
import type { EngineSeeds } from '@/games/engine';
import { freeformEngine } from '@/games/freeform';
import type { FreeformAction, FreeformState } from '@/games/freeform';

const SESSION_ID = '01JARVQZAAAAAAAAAAAAAAAAAA';
const PLAYER_A = '01JARVQZPPPPPPPPPPPPPPPPPP';
const PLAYER_B = '01JARVQZQQQQQQQQQQQQQQQQQQ';
const FIXED_NOW = '2026-04-18T12:00:00.000Z';

function makeSeeds(ids: string[]): EngineSeeds {
  const iter = ids[Symbol.iterator]();
  return {
    now: () => FIXED_NOW,
    newId: () => {
      const { value, done } = iter.next();
      if (done) throw new Error('ran out of ids');
      return value;
    }
  };
}

function seededIds(count: number, seed = 1): string[] {
  let x = seed;
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const suffix = x.toString(36).toUpperCase().padStart(10, '0').slice(0, 10);
    ids.push(('01JARVQZ00000000' + suffix).slice(0, 26));
  }
  return ids;
}

function buildInitial(participants: string[] = [PLAYER_A]): FreeformState {
  return freeformEngine.init({}, participants, SESSION_ID, makeSeeds([]));
}

describe('freeformEngine.init', () => {
  it('creates an in_progress state with the given participants and empty log', () => {
    const state = buildInitial([PLAYER_A, PLAYER_B]);
    expect(state.status).toBe('in_progress');
    expect(state.participantIds).toEqual([PLAYER_A, PLAYER_B]);
    expect(state.inputEventLog).toEqual([]);
    expect(state.sessionId).toBe(SESSION_ID);
  });
});

describe('freeformEngine.reduce — throw', () => {
  it('emits a throw event with the given payload and bumps seq', () => {
    const seeds = makeSeeds(['01JARVQZ00000000000000THR1']);
    const s0 = buildInitial();
    const r = freeformEngine.reduce(
      s0,
      {
        type: 'throw',
        participantId: PLAYER_A,
        segment: 'T',
        value: 60,
        dartIndex: 0
      },
      seeds
    );
    expect(r.error).toBeUndefined();
    expect(r.pop).toEqual([]);
    expect(r.emit).toHaveLength(1);
    const ev = r.emit[0]!;
    expect(ev.type).toBe('throw');
    expect(ev.sessionId).toBe(SESSION_ID);
    expect(ev.seq).toBe(0);
    expect(ev.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(ev.payload).toMatchObject({
      participantId: PLAYER_A,
      segment: 'T',
      value: 60,
      dartIndex: 0
    });
    expect(r.state.inputEventLog).toHaveLength(1);
  });

  it('rejects a throw for an unknown participant', () => {
    const seeds = makeSeeds(['01JARVQZ0000000000000UNUSE']);
    const s0 = buildInitial();
    const r = freeformEngine.reduce(
      s0,
      { type: 'throw', participantId: PLAYER_B, segment: 'S', value: 20, dartIndex: 0 },
      seeds
    );
    expect(r.error?.code).toBe('unknown_participant');
    expect(r.emit).toEqual([]);
    expect(r.state).toBe(s0);
  });
});

describe('freeformEngine.reduce — forfeit', () => {
  it('transitions status to forfeited', () => {
    const seeds = makeSeeds(['01JARVQZ00000000000000FRF1']);
    const s0 = buildInitial();
    const r = freeformEngine.reduce(s0, { type: 'forfeit', participantId: PLAYER_A }, seeds);
    expect(r.error).toBeUndefined();
    expect(r.state.status).toBe('forfeited');
    expect(r.emit[0]?.type).toBe('forfeit');
    expect(freeformEngine.isSessionOver(r.state)).toEqual({ status: 'forfeited' });
  });

  it('blocks further non-undo actions after forfeit', () => {
    const seeds = makeSeeds(seededIds(4));
    let state = buildInitial();
    state = freeformEngine.reduce(state, { type: 'forfeit', participantId: PLAYER_A }, seeds).state;
    const r = freeformEngine.reduce(
      state,
      { type: 'throw', participantId: PLAYER_A, segment: 'S', value: 20, dartIndex: 0 },
      seeds
    );
    expect(r.error?.code).toBe('session_forfeited');
  });
});

describe('freeformEngine.reduce — note', () => {
  it('emits a note event with trimmed text', () => {
    const seeds = makeSeeds(['01JARVQZ00000000000000NOTE']);
    const s0 = buildInitial();
    const r = freeformEngine.reduce(s0, { type: 'note', text: '  good round  ' }, seeds);
    expect(r.emit[0]?.type).toBe('note');
    expect(r.emit[0]?.payload).toEqual({ text: 'good round' });
  });

  it('rejects empty notes', () => {
    const seeds = makeSeeds(['01JARVQZ0000000000000EMPTY']);
    const s0 = buildInitial();
    const r = freeformEngine.reduce(s0, { type: 'note', text: '   ' }, seeds);
    expect(r.error?.code).toBe('empty_note');
  });
});

describe('freeformEngine.reduce — undo', () => {
  it('pops the last input event id', () => {
    const seeds = makeSeeds(seededIds(4));
    let state = buildInitial();
    state = freeformEngine.reduce(
      state,
      { type: 'throw', participantId: PLAYER_A, segment: 'S', value: 20, dartIndex: 0 },
      seeds
    ).state;
    const lastEvent = state.inputEventLog.at(-1)!;
    const r = freeformEngine.reduce(state, { type: 'undo' }, seeds);
    expect(r.pop).toEqual([lastEvent.id]);
    expect(r.emit).toEqual([]);
    expect(r.state.inputEventLog).toEqual([]);
  });

  it('returns error when nothing to undo', () => {
    const seeds = makeSeeds(seededIds(1));
    const r = freeformEngine.reduce(buildInitial(), { type: 'undo' }, seeds);
    expect(r.error?.code).toBe('nothing_to_undo');
  });

  it('undoing a forfeit returns status to in_progress', () => {
    const seeds = makeSeeds(seededIds(4));
    let state = buildInitial();
    state = freeformEngine.reduce(state, { type: 'forfeit', participantId: PLAYER_A }, seeds).state;
    expect(state.status).toBe('forfeited');
    const r = freeformEngine.reduce(state, { type: 'undo' }, seeds);
    expect(r.state.status).toBe('in_progress');
    expect(r.pop).toHaveLength(1);
  });

  it('undo can cross many throws back to empty', () => {
    const seeds = makeSeeds(seededIds(20));
    let state = buildInitial();
    for (let i = 0; i < 7; i += 1) {
      state = freeformEngine.reduce(
        state,
        {
          type: 'throw',
          participantId: PLAYER_A,
          segment: 'S',
          value: 1 + i,
          dartIndex: (i % 3) as 0 | 1 | 2
        },
        seeds
      ).state;
    }
    expect(state.inputEventLog).toHaveLength(7);
    for (let i = 0; i < 7; i += 1) {
      state = freeformEngine.reduce(state, { type: 'undo' }, seeds).state;
    }
    expect(state.inputEventLog).toEqual([]);
    expect(state.status).toBe('in_progress');
  });
});

describe('freeformEngine.view', () => {
  it('reports throw count, last throw, and canUndo', () => {
    const seeds = makeSeeds(seededIds(4));
    let state = buildInitial();
    state = freeformEngine.reduce(
      state,
      { type: 'throw', participantId: PLAYER_A, segment: 'T', value: 60, dartIndex: 0 },
      seeds
    ).state;
    state = freeformEngine.reduce(
      state,
      { type: 'throw', participantId: PLAYER_A, segment: 'DB', value: 50, dartIndex: 1 },
      seeds
    ).state;
    const v = freeformEngine.view(state);
    expect(v.status).toBe('in_progress');
    expect(v.throwCount).toBe(2);
    expect(v.lastThrow).toMatchObject({ segment: 'DB', value: 50 });
    expect(v.canUndo).toBe(true);
  });
});

describe('freeformEngine property: replay(events) equals live reduce accumulation', () => {
  const actionsForSeed = (seed: number): FreeformAction[] => {
    let x = seed || 1;
    const random = () => {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x / 0x7fffffff;
    };
    const segments: Array<FreeformAction> = [];
    const n = 5 + Math.floor(random() * 15);
    for (let i = 0; i < n; i += 1) {
      const roll = random();
      if (roll < 0.65) {
        segments.push({
          type: 'throw',
          participantId: PLAYER_A,
          segment: 'S',
          value: Math.floor(random() * 21),
          dartIndex: (i % 3) as 0 | 1 | 2
        });
      } else if (roll < 0.75) {
        segments.push({ type: 'note', text: `seed-${i}` });
      } else if (roll < 0.8) {
        segments.push({ type: 'forfeit', participantId: PLAYER_A });
      } else {
        segments.push({ type: 'undo' });
      }
    }
    return segments;
  };

  for (const seed of [1, 2, 3, 7, 13, 42, 101, 999]) {
    it(`matches replay for seed ${seed}`, () => {
      const seeds = makeSeeds(seededIds(200, seed));
      const actions = actionsForSeed(seed);
      let live: FreeformState = buildInitial();
      const persistedEvents: GameEvent[] = [];
      for (const action of actions) {
        const r = freeformEngine.reduce(live, action, seeds);
        if (r.error) continue;
        for (const popId of r.pop) {
          const idx = persistedEvents.findIndex((e) => e.id === popId);
          if (idx >= 0) persistedEvents.splice(idx, 1);
        }
        for (const ev of r.emit) persistedEvents.push(ev);
        live = r.state;
      }
      const replayed = freeformEngine.replay(persistedEvents, {}, live.participantIds, SESSION_ID);
      expect(replayed.status).toBe(live.status);
      expect(replayed.inputEventLog.map((e) => e.id)).toEqual(
        live.inputEventLog.map((e) => e.id)
      );
    });
  }
});
