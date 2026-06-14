import { describe, expect, it } from 'vitest';
import type { GameEvent, Session } from '@/domain/types';
import {
  aggregateX01Legs,
  computeX01SessionLegs,
  deriveAvailableConfigs,
  type X01LegParticipant,
  type X01LegRecord,
  type X01SessionLegs
} from '@/stats/x01Legs';

const P = '01J0000000000000000000000P';
const Q = '01J0000000000000000000000Q';
const COMP = '01J000000000000000000000CC';

// ── computeX01SessionLegs via the real replay ──────────────────────────────────

function makeThrow(sessionId: string, seq: number, segment: string, value: number): GameEvent {
  return {
    schemaVersion: 1,
    id: `ev-${seq}`,
    sessionId,
    seq,
    type: 'throw',
    timestamp: new Date(Date.parse('2026-01-01T12:00:00.000Z') + seq * 5000).toISOString(),
    payload: { participantId: P, segment, value }
  };
}

function makeSession(over: Partial<Session> = {}): Session {
  return {
    schemaVersion: 1,
    id: 'sess-1',
    gameModeId: 'x01',
    gameConfig: { startScore: 501, inRule: 'straight', outRule: 'straight', legsToWin: 1 },
    participants: [P],
    status: 'completed',
    startedAt: '2026-01-01T12:00:00.000Z',
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    ...over
  } as Session;
}

describe('computeX01SessionLegs', () => {
  it('records a single won leg with per-participant detail', () => {
    const events: GameEvent[] = [
      makeThrow('sess-1', 0, 'T', 60),
      makeThrow('sess-1', 1, 'T', 60),
      makeThrow('sess-1', 2, 'T', 60), // 180 → 321
      makeThrow('sess-1', 3, 'T', 60),
      makeThrow('sess-1', 4, 'T', 60),
      makeThrow('sess-1', 5, 'T', 57), // 177 → 144
      makeThrow('sess-1', 6, 'T', 60),
      makeThrow('sess-1', 7, 'T', 60),
      makeThrow('sess-1', 8, 'D', 24) // 144 → checkout
    ];
    const result = computeX01SessionLegs(events, makeSession(), 'x01')!;

    expect(result.startScore).toBe(501);
    expect(result.forfeited).toBe(false);
    expect(result.legs).toHaveLength(1);

    const p = result.legs[0]!.perParticipant[P]!;
    expect(result.legs[0]!.winnerParticipantId).toBe(P);
    expect(p.won).toBe(true);
    expect(p.dartsThrown).toBe(9);
    expect(p.scored).toBe(501);
    expect(p.turnScores).toEqual([180, 177, 144]);
    // per-turn remaining, not the final leg snapshot (which is 0 for the winner)
    expect(p.turnRemainingAfter).toEqual([321, 144, 0]);
    expect(p.checkoutHits).toBe(1);
    expect(p.winningCheckout).toBe(144);
  });

  it('flags forfeited sessions', () => {
    const events: GameEvent[] = [
      makeThrow('sess-1', 0, 'T', 60),
      makeThrow('sess-1', 1, 'T', 60),
      makeThrow('sess-1', 2, 'T', 60),
      { schemaVersion: 1, id: 'ev-3', sessionId: 'sess-1', seq: 3, type: 'forfeit', timestamp: '2026-01-01T12:01:00.000Z', payload: { participantId: P } }
    ];
    const result = computeX01SessionLegs(events, makeSession({ status: 'forfeited' }), 'x01')!;
    expect(result.forfeited).toBe(true);
    expect(result.legs[0]!.winnerParticipantId).toBeUndefined();
  });
});

// ── aggregateX01Legs with hand-built leg data ──────────────────────────────────

function part(over: Partial<X01LegParticipant>): X01LegParticipant {
  return {
    dartsThrown: 0,
    scored: 0,
    won: false,
    turnScores: [],
    turnRemainingAfter: [],
    firstNineScored: 0,
    firstNineDarts: 0,
    checkoutOpportunities: 0,
    checkoutHits: 0,
    winningCheckout: 0,
    bustCount: 0,
    ...over
  };
}

function wonLeg(pid: string, darts: number, turns: number, date: string): X01LegRecord {
  return {
    legIndex: 0,
    startedAt: date,
    endedAt: date,
    winnerParticipantId: pid,
    perParticipant: {
      [pid]: part({ won: true, dartsThrown: darts, scored: 501, turnScores: Array(turns).fill(60), checkoutHits: 1, winningCheckout: 40 })
    }
  };
}

function session(over: Partial<X01SessionLegs>): X01SessionLegs {
  return {
    sessionId: 's',
    startScore: 501,
    inRule: 'straight',
    outRule: 'double',
    forfeited: false,
    legs: [],
    ...over
  };
}

describe('aggregateX01Legs', () => {
  it('counts legs won / lost / forfeited from the scoped player perspective', () => {
    const sessions: X01SessionLegs[] = [
      session({ sessionId: 'a', legs: [wonLeg(P, 12, 4, '2026-02-01'), wonLeg(P, 15, 5, '2026-02-02')] }),
      session({
        sessionId: 'b',
        legs: [
          wonLeg(P, 18, 6, '2026-03-01'),
          { legIndex: 1, startedAt: '2026-03-02', endedAt: '2026-03-02', winnerParticipantId: Q, perParticipant: { [P]: part({ dartsThrown: 21, scored: 480, turnScores: [60, 60, 60] }) } }
        ]
      }),
      session({
        sessionId: 'c',
        forfeited: true,
        legs: [
          wonLeg(P, 12, 4, '2026-04-01'),
          { legIndex: 1, startedAt: '2026-04-02', winnerParticipantId: undefined, perParticipant: { [P]: part({ dartsThrown: 6, scored: 120 }) } }
        ]
      })
    ];

    const agg = aggregateX01Legs(sessions, P)!;
    expect(agg.legsStarted).toBe(6);
    expect(agg.legsWonCheckout).toBe(4);
    expect(agg.legsLost).toBe(1);
    expect(agg.legsForfeited).toBe(1);
    expect(agg.bestLegs.map((l) => l.darts)).toEqual([12, 12, 15, 18]);
    expect(agg.turnsToWinDistribution).toEqual([
      { turns: 4, count: 2 },
      { turns: 5, count: 1 },
      { turns: 6, count: 1 }
    ]);
  });

  it('scopes vs-computer to the human and counts losses to the computer', () => {
    const sessions: X01SessionLegs[] = [
      session({
        sessionId: 'd',
        computerParticipantId: COMP,
        computerDifficulty: 7,
        legs: [
          wonLeg(P, 18, 6, '2026-05-01'),
          {
            legIndex: 1,
            startedAt: '2026-05-02',
            endedAt: '2026-05-02',
            winnerParticipantId: COMP,
            perParticipant: {
              [P]: part({ dartsThrown: 24, scored: 400, turnScores: [60, 60, 60] }),
              [COMP]: part({ won: true, dartsThrown: 12, scored: 501, turnScores: [120, 120, 120, 141] })
            }
          }
        ]
      })
    ];

    const agg = aggregateX01Legs(sessions, P)!;
    expect(agg.isVsComputer).toBe(true);
    expect(agg.legsWonCheckout).toBe(1);
    expect(agg.legsLostToComputer).toBe(1);
    expect(agg.legsLost).toBe(1);
    // computer's 12-dart leg must not appear as a best leg for the human
    expect(agg.bestLegs.map((l) => l.darts)).toEqual([18]);
  });

  it('applies the config filter (difficulty)', () => {
    const sessions: X01SessionLegs[] = [
      session({ sessionId: 'd', computerParticipantId: COMP, computerDifficulty: 7, legs: [wonLeg(P, 18, 6, '2026-05-01')] })
    ];
    expect(aggregateX01Legs(sessions, P, { difficulty: 7 })!.legsWonCheckout).toBe(1);
    expect(aggregateX01Legs(sessions, P, { difficulty: 5 })).toBeNull();
  });

  it('computes leg-aggregated averages, not a mean of session means', () => {
    const sessions: X01SessionLegs[] = [
      session({
        sessionId: 'a',
        legs: [
          {
            legIndex: 0,
            startedAt: '2026-02-01',
            endedAt: '2026-02-01',
            winnerParticipantId: P,
            perParticipant: {
              [P]: part({ won: true, dartsThrown: 9, scored: 180, turnScores: [60, 60, 60], firstNineScored: 180, firstNineDarts: 9, checkoutOpportunities: 1, checkoutHits: 1, winningCheckout: 60 })
            }
          }
        ]
      }),
      session({
        sessionId: 'b',
        legs: [
          {
            legIndex: 0,
            startedAt: '2026-02-02',
            endedAt: '2026-02-02',
            winnerParticipantId: P,
            perParticipant: {
              [P]: part({ won: true, dartsThrown: 3, scored: 120, turnScores: [120], firstNineScored: 120, firstNineDarts: 3, checkoutOpportunities: 1, checkoutHits: 1, winningCheckout: 120 })
            }
          }
        ]
      })
    ];

    const agg = aggregateX01Legs(sessions, P)!;
    // (180 + 120) scored over (9 + 3) darts → 25 ppd → 75 three-dart avg
    expect(agg.threeDartAvg).toBeCloseTo(75, 5);
    expect(agg.checkoutPct).toBeCloseTo(1, 5);
    expect(agg.highestCheckout).toBe(120);
    expect(agg.totalDarts).toBe(12);
  });
});

describe('deriveAvailableConfigs', () => {
  it('collects distinct start scores, rules, and difficulties', () => {
    const sessions: X01SessionLegs[] = [
      session({ startScore: 501, inRule: 'straight', outRule: 'double' }),
      session({ startScore: 301, inRule: 'double', outRule: 'double', computerDifficulty: 3 }),
      session({ startScore: 501, computerDifficulty: 7 })
    ];
    const available = deriveAvailableConfigs(sessions);
    expect(available.startScores).toEqual([301, 501]);
    expect(available.difficulties).toEqual([3, 7]);
    expect(available.inRules).toContain('straight');
    expect(available.inRules).toContain('double');
  });
});
