import { describe, expect, it } from 'vitest';
import type { GameEvent, Session } from '@/domain/types';
import type { RtwMode } from '@/games/rtw/config';
import {
  aggregateRtwDetail,
  computeRtwDetail,
  deriveRtwAvailable,
  type RtwParticipantSession,
  type RtwSessionData
} from '@/stats/rtwDetail';

const P = '01J0000000000000000000000P';

function makeSession(gameConfig: Record<string, unknown>): Session {
  return {
    schemaVersion: 1,
    id: 's',
    gameModeId: 'rtw',
    gameConfig,
    participants: [P],
    status: 'completed',
    startedAt: '2026-01-01T12:00:00.000Z',
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z'
  } as Session;
}

function hitDart(seq: number, hit: boolean): GameEvent {
  return {
    schemaVersion: 1,
    id: `ev-${seq}`,
    sessionId: 's',
    seq,
    type: 'throw',
    timestamp: '2026-01-01T12:00:00.000Z',
    payload: { participantId: P, targetIndex: 0, targetValue: 0, hit }
  };
}

describe('computeRtwDetail', () => {
  it('counts hits/darts and per-target tallies for a fixed-dart mode', () => {
    // '1-dart per target' over custom sequence [1,2,3]: hit, miss, hit
    const session = makeSession({
      gameType: 'Single',
      mode: '1-dart per target',
      order: 'Random',
      excludeBull: true,
      customSequence: [1, 2, 3]
    });
    const events = [hitDart(0, true), hitDart(1, false), hitDart(2, true)];
    const data = computeRtwDetail(events, session)!;
    const p = data.byParticipant[P]!;

    expect(data.mode).toBe('1-dart per target');
    expect(p.totalDarts).toBe(3);
    expect(p.totalHits).toBe(2);
    expect(p.targetsHit).toBe(2); // fixed mode → targets actually hit
    expect(p.perTarget[1]).toEqual({ attempts: 1, hits: 1 });
    expect(p.perTarget[2]).toEqual({ attempts: 1, hits: 0 });
  });

  it('counts variable darts-to-complete for Hit once', () => {
    // 'Hit once' over [1,2]: miss, miss, hit on target 1; hit on target 2 → completed
    const session = makeSession({
      gameType: 'Single',
      mode: 'Hit once',
      order: 'Random',
      excludeBull: true,
      customSequence: [1, 2]
    });
    const events = [hitDart(0, false), hitDart(1, false), hitDart(2, true), hitDart(3, true)];
    const data = computeRtwDetail(events, session)!;
    const p = data.byParticipant[P]!;

    expect(data.completed).toBe(true);
    expect(p.totalDarts).toBe(4);
    expect(p.totalHits).toBe(2);
    expect(p.targetsHit).toBe(2);
    expect(p.perTarget[1]).toEqual({ attempts: 3, hits: 1 });
  });
});

function part(over: Partial<RtwParticipantSession>): RtwParticipantSession {
  return { totalDarts: 0, totalHits: 0, targetsHit: 0, targetsTotal: 20, perTarget: {}, ...over };
}

function session(
  id: string,
  date: string,
  mode: RtwMode,
  completed: boolean,
  p: RtwParticipantSession
): RtwSessionData {
  return { sessionId: id, startedAt: date, gameType: 'Single', mode, completed, byParticipant: { [P]: p } };
}

describe('aggregateRtwDetail', () => {
  it('ranks fixed-dart modes by accuracy', () => {
    const sessions = [
      session('a', '2026-02-01', '1-dart per target', true, part({
        totalDarts: 20, totalHits: 15, targetsHit: 15, perTarget: { 1: { attempts: 1, hits: 1 } }
      })),
      session('b', '2026-02-02', '1-dart per target', true, part({
        totalDarts: 20, totalHits: 10, targetsHit: 10, perTarget: { 1: { attempts: 1, hits: 0 } }
      }))
    ];
    const agg = aggregateRtwDetail(sessions, P)!;
    expect(agg.fewestDartsApplicable).toBe(false);
    expect(agg.topKind).toBe('accuracy');
    expect(agg.accuracy).toBeCloseTo(25 / 40, 5);
    expect(agg.topGames.map((g) => (g.kind === 'accuracy' ? g.accuracy : null))).toEqual([0.75, 0.5]);
    const one = agg.byNumber.find((b) => b.target === 1)!;
    expect(one.accuracy).toBeCloseTo(0.5, 5);
    expect(one.hits).toBe(1);
    expect(one.attempts).toBe(2);
  });

  it('ranks variable-dart modes by fewest darts and reports darts-to-finish', () => {
    const sessions = [
      session('a', '2026-03-01', 'Hit once', true, part({ totalDarts: 30, totalHits: 20, targetsHit: 20 })),
      session('b', '2026-03-02', 'Hit once', true, part({ totalDarts: 25, totalHits: 20, targetsHit: 20 }))
    ];
    const agg = aggregateRtwDetail(sessions, P)!;
    expect(agg.fewestDartsApplicable).toBe(true);
    expect(agg.topKind).toBe('darts');
    expect(agg.fewestDarts).toBe(25);
    expect(agg.avgDartsToComplete).toBeCloseTo(27.5, 5);
    expect(agg.topGames.map((g) => (g.kind === 'darts' ? g.darts : null))).toEqual([25, 30]);
  });

  it('falls back to accuracy ranking when modes are mixed', () => {
    const sessions = [
      session('a', '2026-03-01', 'Hit once', true, part({ totalDarts: 30, totalHits: 20 })),
      session('b', '2026-03-02', '1-dart per target', true, part({ totalDarts: 20, totalHits: 10 }))
    ];
    const agg = aggregateRtwDetail(sessions, P)!;
    expect(agg.fewestDartsApplicable).toBe(false);
    expect(agg.topKind).toBe('accuracy');
  });

  it('filters by mode', () => {
    const sessions = [
      session('a', '2026-03-01', 'Hit once', true, part({ totalDarts: 30, totalHits: 20 })),
      session('b', '2026-03-02', '1-dart per target', true, part({ totalDarts: 20, totalHits: 10 }))
    ];
    expect(aggregateRtwDetail(sessions, P, { mode: 'Hit once' })!.totalSessions).toBe(1);
    expect(aggregateRtwDetail(sessions, P, { mode: '3 darts per target' })).toBeNull();
  });
});

describe('deriveRtwAvailable', () => {
  it('collects distinct game types and modes', () => {
    const sessions = [
      session('a', '2026-02-01', 'Hit once', true, part({ totalDarts: 1 })),
      { ...session('b', '2026-02-02', '1-dart per target', true, part({ totalDarts: 1 })), gameType: 'Double' as const }
    ];
    const available = deriveRtwAvailable(sessions);
    expect(available.gameTypes).toEqual(['Double', 'Single']);
    expect(available.modes).toContain('Hit once');
    expect(available.modes).toContain('1-dart per target');
  });
});
