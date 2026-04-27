import { describe, expect, it } from 'vitest';
import { computerThrow, makeThrowRng } from '@/games/ai';
import type { AiDifficulty } from '@/games/ai';
import type { EngineSeeds } from '@/games/engine';
import { x01Engine, X01_DEFAULT_CONFIG } from '@/games/x01';
import type { X01Action } from '@/games/x01';

const SESSION = '01JMP0XVCTEST0SESSION000000';
const HUMAN   = '01JMP0XVCTEST0HUMAN0000000';
const COMPUTER = '01JMP0XVCTEST0COMPUT000000';
const NOW = '2026-04-26T12:00:00.000Z';

let idSeq = 0;
function makeSeeds(): EngineSeeds {
  return { now: () => NOW, newId: () => `01JMP0EVT${String(++idSeq).padStart(17, '0')}` };
}

// ── computerThrow determinism ─────────────────────────────────────────────────

describe('computerThrow determinism', () => {
  it('returns the same result for the same seed + throwIndex', () => {
    const rng1 = makeThrowRng(12345, 0);
    const rng2 = makeThrowRng(12345, 0);
    const r1 = computerThrow(501, 5, rng1);
    const r2 = computerThrow(501, 5, rng2);
    expect(r1).toEqual(r2);
  });

  it('returns different results for different throw indices', () => {
    // With high enough sample, different indices should produce at least some variety
    const results = Array.from({ length: 20 }, (_, i) => {
      const rng = makeThrowRng(42, i);
      return computerThrow(501, 5, rng);
    });
    const unique = new Set(results.map((r) => `${r.segment}:${r.value}`));
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ── computerThrow output validity ─────────────────────────────────────────────

describe('computerThrow output validity', () => {
  const DIFFICULTIES: AiDifficulty[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const REMAINING_SAMPLES = [501, 301, 170, 100, 60, 40, 32, 20, 2];

  for (const diff of DIFFICULTIES) {
    it(`produces valid darts at difficulty ${diff}`, () => {
      for (const rem of REMAINING_SAMPLES) {
        const rng = makeThrowRng(9999, diff * 100 + rem);
        const { segment, value } = computerThrow(rem, diff, rng);
        // segment must be one of the known types
        expect(['S', 'D', 'T', 'SB', 'DB', 'MISS']).toContain(segment);
        // value ranges
        if (segment === 'MISS') expect(value).toBe(0);
        if (segment === 'SB') expect(value).toBe(25);
        if (segment === 'DB') expect(value).toBe(50);
        if (segment === 'S') expect(value).toBeGreaterThanOrEqual(1);
        if (segment === 'S') expect(value).toBeLessThanOrEqual(20);
        if (segment === 'D') expect(value % 2).toBe(0);
        if (segment === 'D') expect(value).toBeGreaterThanOrEqual(2);
        if (segment === 'D') expect(value).toBeLessThanOrEqual(40);
        if (segment === 'T') expect(value % 3).toBe(0);
        if (segment === 'T') expect(value).toBeGreaterThanOrEqual(3);
        if (segment === 'T') expect(value).toBeLessThanOrEqual(60);
      }
    });
  }
});

// ── difficulty 10 hits target frequently ──────────────────────────────────────

describe('computerThrow difficulty scaling', () => {
  it('level 10 hits T20 (value 60) more often than level 1 for remaining 501', () => {
    const runs = 200;
    let hits10 = 0, hits1 = 0;
    for (let i = 0; i < runs; i++) {
      const r10 = computerThrow(501, 10, makeThrowRng(7777, i));
      const r1  = computerThrow(501,  1, makeThrowRng(7778, i));
      if (r10.segment === 'T' && r10.value === 60) hits10++;
      if (r1.segment  === 'T' && r1.value  === 60) hits1++;
    }
    expect(hits10).toBeGreaterThan(hits1);
  });

  it('level 10 aims for double when remaining is a clean double (e.g. 40)', () => {
    let doubleHits = 0;
    for (let i = 0; i < 100; i++) {
      const r = computerThrow(40, 10, makeThrowRng(1234, i));
      if (r.segment === 'D' && r.value === 40) doubleHits++;
    }
    // Level 10 hit chance is 95%; over 100 throws expect well above 50 hits
    expect(doubleHits).toBeGreaterThan(50);
  });
});

// ── x01vc engine integration (uses x01Engine with two participants) ────────────

describe('x01vc engine integration', () => {
  it('starts with HUMAN as active participant when human is first', () => {
    const s = x01Engine.init(X01_DEFAULT_CONFIG, [HUMAN, COMPUTER], SESSION, makeSeeds());
    expect(s.activeParticipantId).toBe(HUMAN);
  });

  it('starts with COMPUTER as active when computer is first', () => {
    const s = x01Engine.init(X01_DEFAULT_CONFIG, [COMPUTER, HUMAN], SESSION, makeSeeds());
    expect(s.activeParticipantId).toBe(COMPUTER);
  });

  it('rotates to computer after human completes a 3-dart turn', () => {
    const sd = makeSeeds();
    let s = x01Engine.init(X01_DEFAULT_CONFIG, [HUMAN, COMPUTER], SESSION, sd);
    const actions: X01Action[] = [
      { type: 'throw', participantId: HUMAN, segment: 'S', value: 20 },
      { type: 'throw', participantId: HUMAN, segment: 'S', value: 20 },
      { type: 'throw', participantId: HUMAN, segment: 'S', value: 20 },
    ];
    for (const a of actions) {
      const r = x01Engine.reduce(s, a, sd);
      expect(r.error).toBeUndefined();
      s = r.state;
    }
    expect(s.activeParticipantId).toBe(COMPUTER);
  });

  it('rejects a throw from the wrong participant', () => {
    const s = x01Engine.init(X01_DEFAULT_CONFIG, [HUMAN, COMPUTER], SESSION, makeSeeds());
    const r = x01Engine.reduce(
      s,
      { type: 'throw', participantId: COMPUTER, segment: 'S', value: 20 },
      makeSeeds()
    );
    expect(r.error?.code).toBe('wrong_turn');
  });

  it('replay(events) matches live reduction for a mixed human+computer session', () => {
    const sd = makeSeeds();
    let s = x01Engine.init(X01_DEFAULT_CONFIG, [HUMAN, COMPUTER], SESSION, sd);
    const allEvents = [];

    // Simulate a short session: human throws, then computer throws (via engine)
    const humanActions: X01Action[] = [
      { type: 'throw', participantId: HUMAN, segment: 'T', value: 60 },
      { type: 'throw', participantId: HUMAN, segment: 'T', value: 60 },
      { type: 'throw', participantId: HUMAN, segment: 'T', value: 60 },
    ];
    const computerActions: X01Action[] = [
      { type: 'throw', participantId: COMPUTER, segment: 'S', value: 20 },
      { type: 'throw', participantId: COMPUTER, segment: 'S', value: 1 },
      { type: 'throw', participantId: COMPUTER, segment: 'MISS', value: 0 },
    ];

    for (const a of [...humanActions, ...computerActions]) {
      const r = x01Engine.reduce(s, a, sd);
      expect(r.error).toBeUndefined();
      allEvents.push(...r.emit);
      s = r.state;
    }

    const replayed = x01Engine.replay(allEvents, X01_DEFAULT_CONFIG, [HUMAN, COMPUTER], SESSION);
    expect(replayed.activeParticipantId).toBe(s.activeParticipantId);
    expect(replayed.legs.at(-1)!.remaining[HUMAN]).toBe(s.legs.at(-1)!.remaining[HUMAN]);
    expect(replayed.legs.at(-1)!.remaining[COMPUTER]).toBe(s.legs.at(-1)!.remaining[COMPUTER]);
  });

  it('computerThrow outputs can be dispatched through x01Engine without error', () => {
    const sd = makeSeeds();
    let s = x01Engine.init(X01_DEFAULT_CONFIG, [HUMAN, COMPUTER], SESSION, sd);

    // Human completes turn
    for (const seg of ['S', 'S', 'S'] as const) {
      const r = x01Engine.reduce(s, { type: 'throw', participantId: HUMAN, segment: seg, value: 20 }, sd);
      expect(r.error).toBeUndefined();
      s = r.state;
    }
    expect(s.activeParticipantId).toBe(COMPUTER);

    // Computer throws 3 darts using the AI module
    for (let i = 0; i < 3; i++) {
      const rng = makeThrowRng(42, i);
      const dart = computerThrow(s.legs.at(-1)!.remaining[COMPUTER]!, 5, rng);
      const r = x01Engine.reduce(
        s,
        { type: 'throw', participantId: COMPUTER, segment: dart.segment, value: dart.value },
        sd
      );
      expect(r.error).toBeUndefined();
      s = r.state;
    }

    // After computer's turn, it should be human's turn again
    expect(s.activeParticipantId).toBe(HUMAN);
  });
});
