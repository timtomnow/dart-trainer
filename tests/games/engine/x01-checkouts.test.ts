import { describe, expect, it } from 'vitest';
import type { EngineSeeds } from '@/games/engine';
import type { X01Action, X01Config, X01State } from '@/games/x01';
import { X01_DEFAULT_CONFIG, x01Engine } from '@/games/x01';

const SESSION = '01JARVQZSSSSSSSSSSSSSSSSSS';
const P1 = '01JARVQZPPPPPPPPPPPPPPPPPP';
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

type Dart = ['S' | 'D' | 'T' | 'SB' | 'DB' | 'MISS', number];

function dartAction(d: Dart): X01Action {
  const [segment, value] = d;
  return { type: 'throw', participantId: P1, segment, value };
}

type TestConfig = Omit<Partial<X01Config>, 'startScore'> & { startScore?: number };

function runDarts(config: TestConfig, darts: Dart[], seed: number): X01State {
  const cfg = { ...X01_DEFAULT_CONFIG, ...config } as X01Config;
  const seeds = makeSeeds(seededIds(darts.length + 4, seed));
  let state = x01Engine.init(cfg, [P1], SESSION, makeSeeds([]));
  for (const d of darts) {
    const r = x01Engine.reduce(state, dartAction(d), seeds);
    if (r.error) throw new Error(`unexpected error ${r.error.code} on ${d.join(':')}`);
    state = r.state;
  }
  return state;
}

type Case = {
  name: string;
  start: number;
  outRule: 'straight' | 'double' | 'masters';
  darts: Dart[];
  expect: 'completed' | 'bust';
};

const CASES: Case[] = [
  { name: '170 finish: T20 T20 DB', start: 170, outRule: 'double', darts: [['T', 60], ['T', 60], ['DB', 50]], expect: 'completed' },
  { name: '167 finish: T20 T19 DB', start: 167, outRule: 'double', darts: [['T', 60], ['T', 57], ['DB', 50]], expect: 'completed' },
  { name: '100 finish: T20 D20', start: 100, outRule: 'double', darts: [['T', 60], ['D', 40]], expect: 'completed' },
  { name: '50 finish: DB', start: 50, outRule: 'double', darts: [['DB', 50]], expect: 'completed' },
  { name: '40 finish: D20', start: 40, outRule: 'double', darts: [['D', 40]], expect: 'completed' },
  { name: '32 finish: D16', start: 32, outRule: 'double', darts: [['D', 32]], expect: 'completed' },
  { name: '2 finish: D1', start: 2, outRule: 'double', darts: [['D', 2]], expect: 'completed' },
  { name: 'bust: 2 -> S1 under double-out leaves 1', start: 2, outRule: 'double', darts: [['S', 1]], expect: 'bust' },
  { name: 'bust: 2 -> S2 under double-out lands on single', start: 2, outRule: 'double', darts: [['S', 2]], expect: 'bust' },
  { name: 'bust: 40 -> T20 overshoots', start: 40, outRule: 'double', darts: [['T', 60]], expect: 'bust' },
  { name: 'bust: 50 -> S10 S20 S20 lands on single', start: 50, outRule: 'double', darts: [['S', 10], ['S', 20], ['S', 20]], expect: 'bust' },
  { name: 'masters: 9 -> T3 finishes', start: 9, outRule: 'masters', darts: [['T', 9]], expect: 'completed' },
  { name: 'masters: 9 -> S9 rejected', start: 9, outRule: 'masters', darts: [['S', 9]], expect: 'bust' },
  { name: 'masters: 6 -> D3 finishes', start: 6, outRule: 'masters', darts: [['D', 6]], expect: 'completed' },
  { name: 'straight-out: 3 -> S2 S1 finishes on a single', start: 3, outRule: 'straight', darts: [['S', 2], ['S', 1]], expect: 'completed' },
  { name: 'straight-out: 1 -> S1 finishes', start: 1, outRule: 'straight', darts: [['S', 1]], expect: 'completed' }
];

describe('x01 checkout fixtures', () => {
  let seed = 1000;
  for (const c of CASES) {
    seed += 1;
    const s = seed;
    it(c.name, () => {
      const state = runDarts({ startScore: c.start, outRule: c.outRule, legsToWin: 1 }, c.darts, s);
      const v = x01Engine.view(state);
      if (c.expect === 'completed') {
        expect(v.status).toBe('completed');
        expect(v.winnerParticipantId).toBe(P1);
      } else {
        expect(v.status).toBe('in_progress');
        expect(v.lastClosedTurn?.bust).toBe(true);
        expect(v.remaining).toBe(c.start);
      }
    });
  }
});
