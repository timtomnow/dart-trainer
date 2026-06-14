import type { GameEvent, Session } from '@/domain/types';
import { parseRtwConfig, type RtwGameType, type RtwMode } from '@/games/rtw/config';
import { buildRtwState } from '@/games/rtw/replay';

// RTW (round-the-world) is hit/miss, not points. "Fewest darts to complete" is
// only meaningful where the dart count varies: Hit once and 3-darts-until-hit-N.
// '3 darts per target' and '1-dart per target' always use a fixed dart count.

const VARIABLE_DART_MODES: RtwMode[] = [
  'Hit once',
  '3-darts until hit 1',
  '3-darts until hit 2',
  '3-darts until hit 3'
];

export function isVariableDartMode(mode: RtwMode): boolean {
  return VARIABLE_DART_MODES.includes(mode);
}

export type RtwTargetTally = { attempts: number; hits: number };

export type RtwParticipantSession = {
  totalDarts: number;
  totalHits: number;
  targetsHit: number;
  targetsTotal: number;
  perTarget: Record<number, RtwTargetTally>;
};

export type RtwSessionData = {
  sessionId: string;
  startedAt: string;
  gameType: RtwGameType;
  mode: RtwMode;
  completed: boolean;
  byParticipant: Record<string, RtwParticipantSession>;
};

export function computeRtwDetail(events: GameEvent[], session: Session): RtwSessionData | null {
  let config;
  try {
    config = parseRtwConfig(session.gameConfig);
  } catch {
    return null;
  }

  const state = buildRtwState(events, config, session.participants, session.id);
  const variable = isVariableDartMode(config.mode);
  const byParticipant: Record<string, RtwParticipantSession> = {};

  for (const pid of session.participants) {
    const turns = state.turns.filter((t) => t.participantId === pid);
    if (turns.length === 0) continue;

    let totalDarts = 0;
    let totalHits = 0;
    let turnsWithHit = 0;
    const perTarget: Record<number, RtwTargetTally> = {};

    for (const turn of turns) {
      totalDarts += turn.dartsInTurn;
      totalHits += turn.hitsInTurn;
      if (turn.hitsInTurn > 0) turnsWithHit++;

      const targetValue = state.targetSequence[turn.targetIndexAtStart];
      if (targetValue === undefined) continue;
      const tally = (perTarget[targetValue] ??= { attempts: 0, hits: 0 });
      tally.attempts += turn.dartsInTurn;
      tally.hits += turn.hitsInTurn;
    }

    byParticipant[pid] = {
      totalDarts,
      totalHits,
      // variable modes only advance on a real hit, so the advance count is the hit count
      targetsHit: variable ? (state.participantTargetIndices[pid] ?? 0) : turnsWithHit,
      targetsTotal: state.targetSequence.length,
      perTarget
    };
  }

  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    gameType: config.gameType,
    mode: config.mode,
    completed: state.status === 'completed',
    byParticipant
  };
}

// ── Sub-filter options ──────────────────────────────────────────────────────────

export type RtwAvailable = { gameTypes: RtwGameType[]; modes: RtwMode[] };

export function deriveRtwAvailable(sessions: RtwSessionData[]): RtwAvailable {
  const gameTypes = new Set<RtwGameType>();
  const modes = new Set<RtwMode>();
  for (const s of sessions) {
    gameTypes.add(s.gameType);
    modes.add(s.mode);
  }
  return { gameTypes: [...gameTypes].sort(), modes: [...modes].sort() };
}

export type RtwConfigFilter = { gameType?: RtwGameType; mode?: RtwMode };

// ── Aggregation ────────────────────────────────────────────────────────────────

export function rtwTargetLabel(value: number): string {
  return value === 25 ? 'Bull' : String(value);
}

export type RtwTopGame =
  | { kind: 'darts'; sessionId: string; date: string; darts: number }
  | { kind: 'accuracy'; sessionId: string; date: string; accuracy: number };

export type RtwNumberStat = {
  target: number;
  label: string;
  attempts: number;
  hits: number;
  accuracy: number | null;
};

export type RtwAggregate = {
  totalSessions: number;
  totalDarts: number;
  totalHits: number;
  totalMisses: number;
  accuracy: number | null;
  avgAccuracy: number | null;
  avgDarts: number;
  avgHits: number;
  avgMisses: number;
  avgTargetsHit: number;
  fewestDartsApplicable: boolean;
  fewestDarts: number | null;
  avgDartsToComplete: number | null;
  topKind: 'darts' | 'accuracy';
  topGames: RtwTopGame[];
  byNumber: RtwNumberStat[];
};

const TOP_LIMIT = 5;

export function aggregateRtwDetail(
  sessions: RtwSessionData[],
  participantId: string,
  filter: RtwConfigFilter = {}
): RtwAggregate | null {
  const rows: Array<{ session: RtwSessionData; p: RtwParticipantSession }> = [];
  for (const s of sessions) {
    if (filter.gameType && s.gameType !== filter.gameType) continue;
    if (filter.mode && s.mode !== filter.mode) continue;
    const p = s.byParticipant[participantId];
    if (p && p.totalDarts > 0) rows.push({ session: s, p });
  }
  if (rows.length === 0) return null;

  const n = rows.length;
  const totalDarts = rows.reduce((a, r) => a + r.p.totalDarts, 0);
  const totalHits = rows.reduce((a, r) => a + r.p.totalHits, 0);
  const accuracyOf = (p: RtwParticipantSession) => (p.totalDarts > 0 ? p.totalHits / p.totalDarts : 0);

  const fewestDartsApplicable = rows.every((r) => isVariableDartMode(r.session.mode));
  const completed = rows.filter((r) => r.session.completed);

  const perTarget = new Map<number, RtwTargetTally>();
  for (const { p } of rows) {
    for (const [target, t] of Object.entries(p.perTarget)) {
      const key = Number(target);
      const agg = perTarget.get(key) ?? { attempts: 0, hits: 0 };
      agg.attempts += t.attempts;
      agg.hits += t.hits;
      perTarget.set(key, agg);
    }
  }
  const byNumber: RtwNumberStat[] = [...perTarget.entries()]
    .sort((a, b) => (a[0] === 25 ? 1 : b[0] === 25 ? -1 : a[0] - b[0]))
    .map(([target, t]) => ({
      target,
      label: rtwTargetLabel(target),
      attempts: t.attempts,
      hits: t.hits,
      accuracy: t.attempts > 0 ? t.hits / t.attempts : null
    }));

  const topKind: 'darts' | 'accuracy' = fewestDartsApplicable && completed.length > 0 ? 'darts' : 'accuracy';
  const topGames: RtwTopGame[] =
    topKind === 'darts'
      ? completed
          .slice()
          .sort((a, b) => a.p.totalDarts - b.p.totalDarts || a.session.startedAt.localeCompare(b.session.startedAt))
          .slice(0, TOP_LIMIT)
          .map((r) => ({ kind: 'darts', sessionId: r.session.sessionId, date: r.session.startedAt, darts: r.p.totalDarts }))
      : rows
          .slice()
          .sort((a, b) => accuracyOf(b.p) - accuracyOf(a.p) || a.session.startedAt.localeCompare(b.session.startedAt))
          .slice(0, TOP_LIMIT)
          .map((r) => ({ kind: 'accuracy', sessionId: r.session.sessionId, date: r.session.startedAt, accuracy: accuracyOf(r.p) }));

  return {
    totalSessions: n,
    totalDarts,
    totalHits,
    totalMisses: totalDarts - totalHits,
    accuracy: totalDarts > 0 ? totalHits / totalDarts : null,
    avgAccuracy: rows.reduce((a, r) => a + accuracyOf(r.p), 0) / n,
    avgDarts: totalDarts / n,
    avgHits: totalHits / n,
    avgMisses: (totalDarts - totalHits) / n,
    avgTargetsHit: rows.reduce((a, r) => a + r.p.targetsHit, 0) / n,
    fewestDartsApplicable,
    fewestDarts: completed.length > 0 ? Math.min(...completed.map((r) => r.p.totalDarts)) : null,
    avgDartsToComplete:
      completed.length > 0 ? completed.reduce((a, r) => a + r.p.totalDarts, 0) / completed.length : null,
    topKind,
    topGames,
    byNumber
  };
}
