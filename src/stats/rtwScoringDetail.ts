import type { GameEvent, Session } from '@/domain/types';
import { parseRtwScoringConfig, type RtwScoringOrder } from '@/games/rtw-scoring/config';
import { buildRtwScoringState } from '@/games/rtw-scoring/replay';

// In RTW Scoring a dart's score is its multiplier (single=1, double=2, triple=3);
// targetValue (1-20, 25=Bull) is the number being aimed at.

export type RtwTargetTally = { attempts: number; hits: number; score: number };

export type RtwParticipantSession = {
  totalDarts: number;
  totalScore: number;
  singles: number;
  doubles: number;
  triples: number;
  misses: number;
  perTarget: Record<number, RtwTargetTally>;
};

export type RtwScoringSessionData = {
  sessionId: string;
  startedAt: string;
  order: RtwScoringOrder;
  byParticipant: Record<string, RtwParticipantSession>;
};

function emptyParticipant(): RtwParticipantSession {
  return {
    totalDarts: 0,
    totalScore: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    misses: 0,
    perTarget: {}
  };
}

export function computeRtwScoringDetail(
  events: GameEvent[],
  session: Session
): RtwScoringSessionData | null {
  let config;
  try {
    config = parseRtwScoringConfig(session.gameConfig);
  } catch {
    return null;
  }

  const state = buildRtwScoringState(events, config, session.participants, session.id);
  const byParticipant: Record<string, RtwParticipantSession> = {};

  for (const turn of state.turns) {
    const p = (byParticipant[turn.participantId] ??= emptyParticipant());
    for (const dart of turn.darts) {
      p.totalDarts++;
      p.totalScore += dart.score;
      if (dart.multiplier === 'single') p.singles++;
      else if (dart.multiplier === 'double') p.doubles++;
      else if (dart.multiplier === 'triple') p.triples++;
      else p.misses++;

      const tally = (p.perTarget[dart.targetValue] ??= { attempts: 0, hits: 0, score: 0 });
      tally.attempts++;
      tally.score += dart.score;
      if (dart.score > 0) tally.hits++;
    }
  }

  return { sessionId: session.id, startedAt: session.startedAt, order: config.order, byParticipant };
}

// ── Aggregation ────────────────────────────────────────────────────────────────

export const RTW_NUMBERS: number[] = [...Array.from({ length: 20 }, (_, i) => i + 1), 25];

export function targetLabel(value: number): string {
  return value === 25 ? 'Bull' : String(value);
}

export function deriveRtwOrders(sessions: RtwScoringSessionData[]): RtwScoringOrder[] {
  const set = new Set<RtwScoringOrder>();
  for (const s of sessions) set.add(s.order);
  return [...set].sort();
}

export type RtwTopScore = { sessionId: string; date: string; score: number };
export type RtwNumberStat = {
  target: number;
  label: string;
  attempts: number;
  accuracy: number | null;
  avgPoints: number | null;
};

export type RtwScoringAggregate = {
  totalSessions: number;
  totalDarts: number;
  totalHits: number;
  totalMisses: number;
  topScores: RtwTopScore[];
  avgPoints: number;
  avgSingles: number;
  avgDoubles: number;
  avgTriples: number;
  maxSingles: number;
  maxDoubles: number;
  maxTriples: number;
  avgMisses: number;
  lowestMisses: number;
  byNumber: RtwNumberStat[];
};

const TOP_SCORES_LIMIT = 5;

export function aggregateRtwScoringDetail(
  sessions: RtwScoringSessionData[],
  participantId: string,
  orderFilter?: RtwScoringOrder
): RtwScoringAggregate | null {
  const rows: Array<{ session: RtwScoringSessionData; p: RtwParticipantSession }> = [];
  for (const s of sessions) {
    if (orderFilter && s.order !== orderFilter) continue;
    const p = s.byParticipant[participantId];
    if (p && p.totalDarts > 0) rows.push({ session: s, p });
  }
  if (rows.length === 0) return null;

  const n = rows.length;
  const sum = (pick: (p: RtwParticipantSession) => number) =>
    rows.reduce((acc, r) => acc + pick(r.p), 0);
  const max = (pick: (p: RtwParticipantSession) => number) =>
    rows.reduce((acc, r) => Math.max(acc, pick(r.p)), 0);

  const totalMisses = sum((p) => p.misses);
  const totalHits = sum((p) => p.singles + p.doubles + p.triples);

  const perTarget = new Map<number, RtwTargetTally>();
  for (const { p } of rows) {
    for (const [target, t] of Object.entries(p.perTarget)) {
      const key = Number(target);
      const agg = perTarget.get(key) ?? { attempts: 0, hits: 0, score: 0 };
      agg.attempts += t.attempts;
      agg.hits += t.hits;
      agg.score += t.score;
      perTarget.set(key, agg);
    }
  }

  const byNumber: RtwNumberStat[] = RTW_NUMBERS.map((target) => {
    const t = perTarget.get(target);
    const attempts = t?.attempts ?? 0;
    return {
      target,
      label: targetLabel(target),
      attempts,
      accuracy: attempts > 0 ? t!.hits / attempts : null,
      avgPoints: attempts > 0 ? t!.score / attempts : null
    };
  });

  const topScores: RtwTopScore[] = rows
    .map((r) => ({ sessionId: r.session.sessionId, date: r.session.startedAt, score: r.p.totalScore }))
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, TOP_SCORES_LIMIT);

  return {
    totalSessions: n,
    totalDarts: sum((p) => p.totalDarts),
    totalHits,
    totalMisses,
    topScores,
    avgPoints: sum((p) => p.totalScore) / n,
    avgSingles: sum((p) => p.singles) / n,
    avgDoubles: sum((p) => p.doubles) / n,
    avgTriples: sum((p) => p.triples) / n,
    maxSingles: max((p) => p.singles),
    maxDoubles: max((p) => p.doubles),
    maxTriples: max((p) => p.triples),
    avgMisses: totalMisses / n,
    lowestMisses: rows.reduce((acc, r) => Math.min(acc, r.p.misses), Infinity),
    byNumber
  };
}
