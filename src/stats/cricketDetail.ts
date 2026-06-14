import type { GameEvent, Session, ThrowSegment } from '@/domain/types';
import { parseCricketConfig } from '@/games/cricket/config';
import { buildCricketState } from '@/games/cricket/replay';
import type { CricketDart } from '@/games/cricket/types';

// Cricket has no fixed target order, so per-number accuracy isn't meaningful.
// A dart counts as a single/double/triple only when it lands on a cricket
// number (target !== null); anything else is a miss.

type DartClass = 'singles' | 'doubles' | 'triples' | 'misses';

function classify(dart: CricketDart): DartClass {
  if (dart.target === null) return 'misses';
  switch (dart.segment as ThrowSegment) {
    case 'T':
      return 'triples';
    case 'D':
    case 'DB':
      return 'doubles';
    case 'S':
    case 'SB':
      return 'singles';
    default:
      return 'misses';
  }
}

export type CricketLegParticipant = {
  dartsThrown: number;
  turns: number;
  singles: number;
  doubles: number;
  triples: number;
  misses: number;
  won: boolean;
};

export type CricketLegRecord = {
  startedAt: string;
  endedAt?: string;
  winnerParticipantId?: string;
  perParticipant: Record<string, CricketLegParticipant>;
};

export type CricketSessionData = {
  sessionId: string;
  startedAt: string;
  forfeited: boolean;
  legs: CricketLegRecord[];
};

function emptyParticipant(): CricketLegParticipant {
  return { dartsThrown: 0, turns: 0, singles: 0, doubles: 0, triples: 0, misses: 0, won: false };
}

export function computeCricketDetail(
  events: GameEvent[],
  session: Session
): CricketSessionData | null {
  let config;
  try {
    config = parseCricketConfig(session.gameConfig);
  } catch {
    return null;
  }

  const state = buildCricketState(events, config, session.participants, session.id);

  const legs: CricketLegRecord[] = state.legs.map((leg) => {
    const perParticipant: Record<string, CricketLegParticipant> = {};
    for (const turn of leg.turns) {
      if (!turn.closed) continue;
      const p = (perParticipant[turn.participantId] ??= emptyParticipant());
      p.turns++;
      for (const dart of turn.darts) {
        p.dartsThrown++;
        p[classify(dart)]++;
      }
    }
    if (leg.winnerParticipantId) {
      (perParticipant[leg.winnerParticipantId] ??= emptyParticipant()).won = true;
    }
    return {
      startedAt: leg.startedAt,
      endedAt: leg.endedAt,
      winnerParticipantId: leg.winnerParticipantId,
      perParticipant
    };
  });

  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    forfeited: session.status === 'forfeited',
    legs
  };
}

// ── Aggregation ────────────────────────────────────────────────────────────────

export type CricketBestLeg = { sessionId: string; date: string; darts: number };

export type CricketAggregate = {
  totalSessions: number;
  totalDarts: number;
  totalMarks: number;
  marksPerRound: number | null;
  totalSingles: number;
  totalDoubles: number;
  totalTriples: number;
  totalMisses: number;
  avgDarts: number;
  avgSingles: number;
  avgDoubles: number;
  avgTriples: number;
  avgMisses: number;
  maxSingles: number;
  maxDoubles: number;
  maxTriples: number;
  fewestMisses: number;
  fewestDarts: number | null;
  avgDartsToComplete: number | null;
  bestLegs: CricketBestLeg[];
};

const BEST_LEGS_LIMIT = 5;

function marksOf(s: { singles: number; doubles: number; triples: number }): number {
  return s.singles + s.doubles * 2 + s.triples * 3;
}

export function aggregateCricketDetail(
  sessions: CricketSessionData[],
  participantId: string
): CricketAggregate | null {
  type Rollup = {
    darts: number;
    turns: number;
    singles: number;
    doubles: number;
    triples: number;
    misses: number;
  };
  const perSession: Rollup[] = [];
  const wonLegs: CricketBestLeg[] = [];

  for (const s of sessions) {
    const r: Rollup = { darts: 0, turns: 0, singles: 0, doubles: 0, triples: 0, misses: 0 };
    for (const leg of s.legs) {
      const p = leg.perParticipant[participantId];
      if (!p) continue;
      r.darts += p.dartsThrown;
      r.turns += p.turns;
      r.singles += p.singles;
      r.doubles += p.doubles;
      r.triples += p.triples;
      r.misses += p.misses;
      if (p.won) {
        wonLegs.push({ sessionId: s.sessionId, date: leg.endedAt ?? leg.startedAt, darts: p.dartsThrown });
      }
    }
    if (r.darts > 0) perSession.push(r);
  }

  const n = perSession.length;
  if (n === 0) return null;

  const sum = (pick: (r: Rollup) => number) => perSession.reduce((a, r) => a + pick(r), 0);
  const max = (pick: (r: Rollup) => number) => perSession.reduce((a, r) => Math.max(a, pick(r)), 0);
  const min = (pick: (r: Rollup) => number) =>
    perSession.reduce((a, r) => Math.min(a, pick(r)), Infinity);

  const totalDarts = sum((r) => r.darts);
  const totalTurns = sum((r) => r.turns);
  const totalMarks = sum((r) => marksOf(r));

  wonLegs.sort((a, b) => a.darts - b.darts || a.date.localeCompare(b.date));

  return {
    totalSessions: n,
    totalDarts,
    totalMarks,
    marksPerRound: totalTurns > 0 ? totalMarks / totalTurns : null,
    totalSingles: sum((r) => r.singles),
    totalDoubles: sum((r) => r.doubles),
    totalTriples: sum((r) => r.triples),
    totalMisses: sum((r) => r.misses),
    avgDarts: totalDarts / n,
    avgSingles: sum((r) => r.singles) / n,
    avgDoubles: sum((r) => r.doubles) / n,
    avgTriples: sum((r) => r.triples) / n,
    avgMisses: sum((r) => r.misses) / n,
    maxSingles: max((r) => r.singles),
    maxDoubles: max((r) => r.doubles),
    maxTriples: max((r) => r.triples),
    fewestMisses: min((r) => r.misses),
    fewestDarts: wonLegs.length > 0 ? wonLegs[0]!.darts : null,
    avgDartsToComplete:
      wonLegs.length > 0 ? wonLegs.reduce((a, l) => a + l.darts, 0) / wonLegs.length : null,
    bestLegs: wonLegs.slice(0, BEST_LEGS_LIMIT)
  };
}
