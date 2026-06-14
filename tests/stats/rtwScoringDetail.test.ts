import { describe, expect, it } from 'vitest';
import type { GameEvent, Session } from '@/domain/types';
import {
  aggregateRtwScoringDetail,
  computeRtwScoringDetail,
  deriveRtwOrders,
  type RtwParticipantSession,
  type RtwScoringSessionData
} from '@/stats/rtwScoringDetail';

const P = '01J0000000000000000000000P';

// ── compute via the real replay ────────────────────────────────────────────────

function makeThrow(seq: number, multiplier: string): GameEvent {
  return {
    schemaVersion: 1,
    id: `ev-${seq}`,
    sessionId: 's',
    seq,
    type: 'throw',
    timestamp: '2026-01-01T12:00:00.000Z',
    payload: { participantId: P, multiplier, targetIndex: 0, targetValue: 0, dartInTurn: 0 }
  };
}

function makeSession(): Session {
  return {
    schemaVersion: 1,
    id: 's',
    gameModeId: 'rtw-scoring',
    gameConfig: { order: '1-20' },
    participants: [P],
    status: 'forfeited',
    startedAt: '2026-01-01T12:00:00.000Z',
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z'
  } as Session;
}

describe('computeRtwScoringDetail', () => {
  it('tallies multipliers, score, and per-target attempts/hits', () => {
    // 3 darts at target 1 (index 0): single, double, triple
    const events = [makeThrow(0, 'single'), makeThrow(1, 'double'), makeThrow(2, 'triple')];
    const data = computeRtwScoringDetail(events, makeSession())!;
    const p = data.byParticipant[P]!;

    expect(data.order).toBe('1-20');
    expect(p.totalDarts).toBe(3);
    expect(p.singles).toBe(1);
    expect(p.doubles).toBe(1);
    expect(p.triples).toBe(1);
    expect(p.misses).toBe(0);
    expect(p.totalScore).toBe(6); // 1 + 2 + 3
    expect(p.perTarget[1]).toEqual({ attempts: 3, hits: 3, score: 6 });
  });
});

// ── aggregation with hand-built data ────────────────────────────────────────────

function part(over: Partial<RtwParticipantSession>): RtwParticipantSession {
  return { totalDarts: 0, totalScore: 0, singles: 0, doubles: 0, triples: 0, misses: 0, perTarget: {}, ...over };
}

function session(id: string, date: string, p: RtwParticipantSession): RtwScoringSessionData {
  return { sessionId: id, startedAt: date, order: '1-20', byParticipant: { [P]: p } };
}

describe('aggregateRtwScoringDetail', () => {
  const sessions: RtwScoringSessionData[] = [
    session('a', '2026-02-01', part({
      totalDarts: 63, totalScore: 65, singles: 30, doubles: 10, triples: 5, misses: 8,
      perTarget: { 1: { attempts: 3, hits: 3, score: 6 }, 25: { attempts: 3, hits: 1, score: 1 } }
    })),
    session('b', '2026-02-02', part({
      totalDarts: 47, totalScore: 36, singles: 20, doubles: 5, triples: 2, misses: 20,
      perTarget: { 1: { attempts: 3, hits: 2, score: 4 } }
    }))
  ];

  const agg = aggregateRtwScoringDetail(sessions, P)!;

  it('computes totals and per-session averages', () => {
    expect(agg.totalSessions).toBe(2);
    expect(agg.totalDarts).toBe(110);
    expect(agg.totalHits).toBe(72);
    expect(agg.totalMisses).toBe(28);
    expect(agg.avgPoints).toBeCloseTo(50.5, 5);
    expect(agg.avgSingles).toBe(25);
    expect(agg.avgDoubles).toBe(7.5);
    expect(agg.avgTriples).toBe(3.5);
    expect(agg.avgMisses).toBe(14);
  });

  it('computes per-session bests', () => {
    expect(agg.maxSingles).toBe(30);
    expect(agg.maxDoubles).toBe(10);
    expect(agg.maxTriples).toBe(5);
    expect(agg.lowestMisses).toBe(8);
  });

  it('ranks the top scores', () => {
    expect(agg.topScores.map((s) => s.score)).toEqual([65, 36]);
  });

  it('aggregates accuracy and average points by number', () => {
    const one = agg.byNumber.find((b) => b.target === 1)!;
    expect(one.attempts).toBe(6);
    expect(one.accuracy).toBeCloseTo(5 / 6, 5);
    expect(one.avgPoints).toBeCloseTo(10 / 6, 5);

    const bull = agg.byNumber.find((b) => b.target === 25)!;
    expect(bull.label).toBe('Bull');
    expect(bull.accuracy).toBeCloseTo(1 / 3, 5);

    const untried = agg.byNumber.find((b) => b.target === 10)!;
    expect(untried.attempts).toBe(0);
    expect(untried.accuracy).toBeNull();
    expect(untried.avgPoints).toBeNull();
  });

  it('covers 1-20 plus bull, in order', () => {
    expect(agg.byNumber).toHaveLength(21);
    expect(agg.byNumber[0]!.target).toBe(1);
    expect(agg.byNumber[20]!.target).toBe(25);
  });

  it('filters by order and returns null when nothing matches', () => {
    expect(aggregateRtwScoringDetail(sessions, P, '1-20')!.totalSessions).toBe(2);
    expect(aggregateRtwScoringDetail(sessions, P, '20-1')).toBeNull();
  });
});

describe('deriveRtwOrders', () => {
  it('collects distinct orders', () => {
    const data: RtwScoringSessionData[] = [
      session('a', '2026-02-01', part({ totalDarts: 1 })),
      { ...session('b', '2026-02-02', part({ totalDarts: 1 })), order: '20-1' }
    ];
    expect(deriveRtwOrders(data)).toEqual(['1-20', '20-1']);
  });
});
