import { describe, expect, it } from 'vitest';
import type { GameEvent, Session } from '@/domain/types';
import {
  aggregateCricketDetail,
  computeCricketDetail,
  type CricketLegParticipant,
  type CricketSessionData
} from '@/stats/cricketDetail';

const P = '01J0000000000000000000000P';
const Q = '01J0000000000000000000000Q';

function makeThrow(seq: number, segment: string, value: number): GameEvent {
  return {
    schemaVersion: 1,
    id: `ev-${seq}`,
    sessionId: 's',
    seq,
    type: 'throw',
    timestamp: '2026-01-01T12:00:00.000Z',
    payload: { participantId: P, segment, value }
  };
}

function makeSession(over: Partial<Session> = {}): Session {
  return {
    schemaVersion: 1,
    id: 's',
    gameModeId: 'cricket',
    gameConfig: { legsToWin: 1 },
    participants: [P],
    status: 'completed',
    startedAt: '2026-01-01T12:00:00.000Z',
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    ...over
  } as Session;
}

describe('computeCricketDetail', () => {
  it('classifies darts and records a won board in fewest darts', () => {
    // close 20,19,18,17,16,15 with triples, then bull with DB + SB → solo win in 8 darts
    const events = [
      makeThrow(0, 'T', 60), // T20
      makeThrow(1, 'T', 57), // T19
      makeThrow(2, 'T', 54), // T18
      makeThrow(3, 'T', 51), // T17
      makeThrow(4, 'T', 48), // T16
      makeThrow(5, 'T', 45), // T15
      makeThrow(6, 'DB', 50), // double bull (2 marks)
      makeThrow(7, 'SB', 25) // single bull (1 mark) → closes 25 → win
    ];
    const data = computeCricketDetail(events, makeSession())!;
    expect(data.legs).toHaveLength(1);
    const p = data.legs[0]!.perParticipant[P]!;
    expect(p.won).toBe(true);
    expect(p.dartsThrown).toBe(8);
    expect(p.turns).toBe(3);
    expect(p.triples).toBe(6);
    expect(p.doubles).toBe(1);
    expect(p.singles).toBe(1);
    expect(p.misses).toBe(0);
  });

  it('counts non-cricket and missed darts as misses', () => {
    const events = [
      makeThrow(0, 'T', 60), // triple 20
      makeThrow(1, 'S', 5), // single 5 → not a cricket number → miss
      makeThrow(2, 'MISS', 0) // miss
    ];
    const data = computeCricketDetail(events, makeSession())!;
    const p = data.legs[0]!.perParticipant[P]!;
    expect(p.triples).toBe(1);
    expect(p.misses).toBe(2);
    expect(p.won).toBe(false);
  });
});

function part(over: Partial<CricketLegParticipant>): CricketLegParticipant {
  return { dartsThrown: 0, turns: 0, singles: 0, doubles: 0, triples: 0, misses: 0, won: false, ...over };
}

function wonSession(id: string, date: string, p: CricketLegParticipant): CricketSessionData {
  return {
    sessionId: id,
    startedAt: date,
    forfeited: false,
    legs: [{ startedAt: date, endedAt: date, winnerParticipantId: P, perParticipant: { [P]: p } }]
  };
}

describe('aggregateCricketDetail', () => {
  const sessions: CricketSessionData[] = [
    wonSession('a', '2026-02-01', part({ dartsThrown: 24, turns: 8, singles: 10, doubles: 3, triples: 6, misses: 5, won: true })),
    wonSession('b', '2026-02-02', part({ dartsThrown: 20, turns: 7, singles: 8, doubles: 2, triples: 7, misses: 3, won: true }))
  ];
  const agg = aggregateCricketDetail(sessions, P)!;

  it('computes overview totals and MPR', () => {
    expect(agg.totalSessions).toBe(2);
    expect(agg.totalDarts).toBe(44);
    expect(agg.totalMarks).toBe(67); // (10+6+18) + (8+4+21)
    expect(agg.marksPerRound).toBeCloseTo(67 / 15, 5);
  });

  it('computes hit-count totals and per-session averages', () => {
    expect(agg.totalSingles).toBe(18);
    expect(agg.totalTriples).toBe(13);
    expect(agg.totalMisses).toBe(8);
    expect(agg.avgDarts).toBe(22);
    expect(agg.avgTriples).toBe(6.5);
    expect(agg.avgMisses).toBe(4);
  });

  it('computes per-session bests', () => {
    expect(agg.maxSingles).toBe(10);
    expect(agg.maxDoubles).toBe(3);
    expect(agg.maxTriples).toBe(7);
    expect(agg.fewestMisses).toBe(3);
  });

  it('ranks best boards by fewest darts', () => {
    expect(agg.bestLegs.map((l) => l.darts)).toEqual([20, 24]);
    expect(agg.fewestDarts).toBe(20);
    expect(agg.avgDartsToComplete).toBe(22);
  });

  it('ignores other participants and unfinished boards', () => {
    const mixed: CricketSessionData[] = [
      {
        sessionId: 'c',
        startedAt: '2026-03-01',
        forfeited: false,
        legs: [
          {
            startedAt: '2026-03-01',
            winnerParticipantId: Q,
            perParticipant: {
              [P]: part({ dartsThrown: 30, turns: 10, singles: 5, misses: 25 }),
              [Q]: part({ dartsThrown: 21, won: true })
            }
          }
        ]
      }
    ];
    const a = aggregateCricketDetail(mixed, P)!;
    expect(a.totalSessions).toBe(1);
    expect(a.totalDarts).toBe(30);
    expect(a.bestLegs).toHaveLength(0); // P did not win
    expect(a.fewestDarts).toBeNull();
  });
});
