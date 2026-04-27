import { describe, expect, it } from 'vitest';
import { cricketEngine } from '@/games/cricket';
import type { CricketAction } from '@/games/cricket';
import type { EngineSeeds } from '@/games/engine';
import { RTW_DEFAULT_CONFIG, rtwEngine } from '@/games/rtw';
import { RTW_SCORING_DEFAULT_CONFIG, rtwScoringEngine } from '@/games/rtw-scoring';
import type { RtwScoringAction } from '@/games/rtw-scoring';
import { X01_DEFAULT_CONFIG, x01Engine } from '@/games/x01';
import type { X01Action } from '@/games/x01';

const SESSION = '01JMP0MULTISESSION000000000';
const P1 = '01JMP0PARTICIPAN100000000000';
const P2 = '01JMP0PARTICIPAN200000000000';
const NOW = '2026-04-26T12:00:00.000Z';

let idSeq = 0;
function makeSeeds(): EngineSeeds {
  return { now: () => NOW, newId: () => `01JMP0EVT${String(++idSeq).padStart(17, '0')}` };
}

// ── X01 multi-player ──────────────────────────────────────────────────────────

describe('x01 multi-player', () => {
  it('starts with P1 as active, both participant IDs in view', () => {
    const s = x01Engine.init(X01_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const v = x01Engine.view(s);
    expect(s.activeParticipantId).toBe(P1);
    expect(v.participantIds).toEqual([P1, P2]);
  });

  it('rotates to P2 after P1 completes a 3-dart turn', () => {
    const s0 = x01Engine.init(X01_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const actions: X01Action[] = [
      { type: 'throw', participantId: P1, segment: 'S', value: 20 },
      { type: 'throw', participantId: P1, segment: 'S', value: 20 },
      { type: 'throw', participantId: P1, segment: 'S', value: 20 },
    ];
    let s = s0;
    for (const a of actions) {
      const r = x01Engine.reduce(s, a, makeSeeds());
      expect(r.error).toBeUndefined();
      s = r.state;
    }
    expect(s.activeParticipantId).toBe(P2);
  });

  it('rejects a throw from P2 when it is P1s turn', () => {
    const s = x01Engine.init(X01_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const r = x01Engine.reduce(s, { type: 'throw', participantId: P2, segment: 'S', value: 20 }, makeSeeds());
    expect(r.error?.code).toBe('wrong_turn');
  });

  it('replay(events) equals live accumulated state for two players', () => {
    const s0 = x01Engine.init(X01_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const actions: X01Action[] = [
      { type: 'throw', participantId: P1, segment: 'S', value: 20 },
      { type: 'throw', participantId: P1, segment: 'S', value: 5 },
      { type: 'throw', participantId: P1, segment: 'S', value: 1 },
      { type: 'throw', participantId: P2, segment: 'T', value: 60 },
      { type: 'throw', participantId: P2, segment: 'S', value: 1 },
      { type: 'throw', participantId: P2, segment: 'S', value: 1 },
    ];
    const sd = makeSeeds();
    let live = s0;
    const allEvents = [];
    for (const a of actions) {
      const r = x01Engine.reduce(live, a, sd);
      expect(r.error).toBeUndefined();
      allEvents.push(...r.emit);
      live = r.state;
    }
    const replayed = x01Engine.replay(allEvents, X01_DEFAULT_CONFIG, [P1, P2], SESSION);
    expect(replayed.activeParticipantId).toBe(live.activeParticipantId);
    expect(replayed.legs.at(-1)!.remaining).toEqual(live.legs.at(-1)!.remaining);
  });

  it('participantStats populated after forfeit with two players', () => {
    const s0 = x01Engine.init(X01_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const r = x01Engine.reduce(s0, { type: 'forfeit', participantId: P1 }, makeSeeds());
    expect(r.state.status).toBe('forfeited');
    const v = x01Engine.view(r.state);
    expect(v.participantStats).toBeDefined();
    expect(v.participantStats![P1]).toBeDefined();
    expect(v.participantStats![P2]).toBeDefined();
  });

  it('participantStats not populated during in_progress', () => {
    const s = x01Engine.init(X01_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    expect(x01Engine.view(s).participantStats).toBeUndefined();
  });

  it('single-player participantStats undefined even after forfeit', () => {
    const s0 = x01Engine.init(X01_DEFAULT_CONFIG, [P1], SESSION, makeSeeds());
    const r = x01Engine.reduce(s0, { type: 'forfeit', participantId: P1 }, makeSeeds());
    expect(x01Engine.view(r.state).participantStats).toBeUndefined();
  });
});

// ── Cricket multi-player ───────────────────────────────────────────────────────

describe('cricket multi-player', () => {
  it('starts with P1 as active participant', () => {
    const s = cricketEngine.init({ legsToWin: 1 }, [P1, P2], SESSION, makeSeeds());
    expect(s.activeParticipantId).toBe(P1);
  });

  it('rotates to P2 after P1 completes a 3-dart turn', () => {
    const s0 = cricketEngine.init({ legsToWin: 1 }, [P1, P2], SESSION, makeSeeds());
    const actions: CricketAction[] = [
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
      { type: 'throw', participantId: P1, segment: 'MISS', value: 0 },
    ];
    let s = s0;
    for (const a of actions) {
      const r = cricketEngine.reduce(s, a, makeSeeds());
      expect(r.error).toBeUndefined();
      s = r.state;
    }
    expect(s.activeParticipantId).toBe(P2);
  });

  it('rejects throw from wrong participant', () => {
    const s = cricketEngine.init({ legsToWin: 1 }, [P1, P2], SESSION, makeSeeds());
    const r = cricketEngine.reduce(s, { type: 'throw', participantId: P2, segment: 'S', value: 20 }, makeSeeds());
    expect(r.error?.code).toBe('wrong_turn');
  });

  it('participantStats populated after forfeit with two players', () => {
    const s0 = cricketEngine.init({ legsToWin: 1 }, [P1, P2], SESSION, makeSeeds());
    const r = cricketEngine.reduce(s0, { type: 'forfeit', participantId: P1 }, makeSeeds());
    const v = cricketEngine.view(r.state);
    expect(v.participantStats).toBeDefined();
    expect(v.participantStats![P1]).toBeDefined();
    expect(v.participantStats![P2]).toBeDefined();
  });

  it('single-player: participantStats undefined even after forfeit', () => {
    const s0 = cricketEngine.init({ legsToWin: 1 }, [P1], SESSION, makeSeeds());
    const r = cricketEngine.reduce(s0, { type: 'forfeit', participantId: P1 }, makeSeeds());
    expect(cricketEngine.view(r.state).participantStats).toBeUndefined();
  });
});

// ── RTW multi-player (race mode) ───────────────────────────────────────────────

describe('rtw multi-player race mode', () => {
  it('starts with P1 as active, both at target index 0', () => {
    const s = rtwEngine.init(RTW_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    expect(s.activeParticipantId).toBe(P1);
    expect(s.participantTargetIndices[P1]).toBe(0);
    expect(s.participantTargetIndices[P2]).toBe(0);
  });

  it('rotates to P2 after P1 completes a hit-once turn', () => {
    const cfg = { ...RTW_DEFAULT_CONFIG, mode: 'Hit once' as const };
    const s0 = rtwEngine.init(cfg, [P1, P2], SESSION, makeSeeds());
    const r = rtwEngine.reduce(s0, { type: 'throw', participantId: P1, hit: true }, makeSeeds());
    expect(r.error).toBeUndefined();
    expect(r.state.activeParticipantId).toBe(P2);
  });

  it('P1 and P2 track independent target indices', () => {
    const cfg = { ...RTW_DEFAULT_CONFIG, mode: 'Hit once' as const };
    const s0 = rtwEngine.init(cfg, [P1, P2], SESSION, makeSeeds());
    const r1 = rtwEngine.reduce(s0, { type: 'throw', participantId: P1, hit: true }, makeSeeds());
    expect(r1.state.participantTargetIndices[P1]).toBe(1);
    expect(r1.state.participantTargetIndices[P2]).toBe(0);
    const r2 = rtwEngine.reduce(r1.state, { type: 'throw', participantId: P2, hit: false }, makeSeeds());
    expect(r2.state.participantTargetIndices[P1]).toBe(1);
    expect(r2.state.participantTargetIndices[P2]).toBe(0);
  });

  it('view exposes participantTargetIndices and participantIds when multi-player', () => {
    const s = rtwEngine.init(RTW_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const v = rtwEngine.view(s);
    expect(v.participantTargetIndices).toBeDefined();
    expect(v.participantIds).toEqual([P1, P2]);
  });

  it('single-player: participantTargetIndices undefined in view', () => {
    const s = rtwEngine.init(RTW_DEFAULT_CONFIG, [P1], SESSION, makeSeeds());
    expect(rtwEngine.view(s).participantTargetIndices).toBeUndefined();
  });
});

// ── RTW Scoring multi-player (synchronized) ────────────────────────────────────

describe('rtw-scoring multi-player synchronized mode', () => {
  it('starts with P1 as active', () => {
    const s = rtwScoringEngine.init(RTW_SCORING_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    expect(s.activeParticipantId).toBe(P1);
  });

  it('rotates to P2 after P1 throws 3 darts', () => {
    const s0 = rtwScoringEngine.init(RTW_SCORING_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const actions: RtwScoringAction[] = [
      { type: 'throw', participantId: P1, multiplier: 'single' },
      { type: 'throw', participantId: P1, multiplier: 'miss' },
      { type: 'throw', participantId: P1, multiplier: 'single' },
    ];
    let s = s0;
    for (const a of actions) {
      const r = rtwScoringEngine.reduce(s, a, makeSeeds());
      expect(r.error).toBeUndefined();
      s = r.state;
    }
    expect(s.activeParticipantId).toBe(P2);
    expect(s.currentTargetIndex).toBe(0);
  });

  it('advances target after both players complete a turn', () => {
    const s0 = rtwScoringEngine.init(RTW_SCORING_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const actions: RtwScoringAction[] = [
      { type: 'throw', participantId: P1, multiplier: 'single' },
      { type: 'throw', participantId: P1, multiplier: 'miss' },
      { type: 'throw', participantId: P1, multiplier: 'single' },
      { type: 'throw', participantId: P2, multiplier: 'miss' },
      { type: 'throw', participantId: P2, multiplier: 'miss' },
      { type: 'throw', participantId: P2, multiplier: 'triple' },
    ];
    let s = s0;
    for (const a of actions) {
      const r = rtwScoringEngine.reduce(s, a, makeSeeds());
      expect(r.error).toBeUndefined();
      s = r.state;
    }
    expect(s.currentTargetIndex).toBe(1);
    expect(s.activeParticipantId).toBe(P1);
  });

  it('tracks per-participant scores independently', () => {
    const s0 = rtwScoringEngine.init(RTW_SCORING_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const actions: RtwScoringAction[] = [
      { type: 'throw', participantId: P1, multiplier: 'triple' },
      { type: 'throw', participantId: P1, multiplier: 'triple' },
      { type: 'throw', participantId: P1, multiplier: 'triple' },
      { type: 'throw', participantId: P2, multiplier: 'miss' },
      { type: 'throw', participantId: P2, multiplier: 'miss' },
      { type: 'throw', participantId: P2, multiplier: 'miss' },
    ];
    let s = s0;
    for (const a of actions) {
      const r = rtwScoringEngine.reduce(s, a, makeSeeds());
      expect(r.error).toBeUndefined();
      s = r.state;
    }
    expect(s.participantScores[P1]).toBe(9);
    expect(s.participantScores[P2]).toBe(0);
  });

  it('view exposes participantScores and participantIds when multi-player', () => {
    const s = rtwScoringEngine.init(RTW_SCORING_DEFAULT_CONFIG, [P1, P2], SESSION, makeSeeds());
    const v = rtwScoringEngine.view(s);
    expect(v.participantScores).toBeDefined();
    expect(v.participantIds).toEqual([P1, P2]);
  });

  it('single-player: participantScores undefined in view', () => {
    const s = rtwScoringEngine.init(RTW_SCORING_DEFAULT_CONFIG, [P1], SESSION, makeSeeds());
    expect(rtwScoringEngine.view(s).participantScores).toBeUndefined();
  });
});
