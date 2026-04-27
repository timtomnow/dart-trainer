import type {
  RtwParticipantStats,
  RtwScoringParticipantStats,
  RtwScoringSessionStats,
  RtwSessionStats
} from './types';
import type { GameEvent, Session } from '@/domain/types';
import type { RtwConfig } from '@/games/rtw/config';
import { buildRtwState } from '@/games/rtw/replay';
import type { RtwScoringConfig } from '@/games/rtw-scoring/config';
import { buildRtwScoringState } from '@/games/rtw-scoring/replay';

type SessionShape = Pick<Session, 'id' | 'participants' | 'startedAt'>;

export function computeRtwStats(
  events: GameEvent[],
  config: RtwConfig,
  session: SessionShape
): RtwSessionStats {
  const state = buildRtwState(events, config, session.participants, session.id);

  const byParticipant: Record<string, RtwParticipantStats> = {};

  for (const pid of session.participants) {
    const myTurns = state.turns.filter((t) => t.participantId === pid);
    const dartsThrown = myTurns.reduce((s, t) => s + t.dartsInTurn, 0);
    const targetsHit =
      config.mode === '1-dart per target'
        ? myTurns.filter((t) => t.hitsInTurn > 0).length
        : (state.participantTargetIndices[pid] ?? 0);
    byParticipant[pid] = { targetsHit, dartsThrown };
  }

  // Overall stats use the active player's perspective for single-player compat
  const activePid = state.activeParticipantId;
  const activeTurns = state.turns.filter((t) => t.participantId === activePid);
  const dartsThrown = activeTurns.reduce((s, t) => s + t.dartsInTurn, 0);
  const targetsHit =
    config.mode === '1-dart per target'
      ? activeTurns.filter((t) => t.hitsInTurn > 0).length
      : state.currentTargetIndex;
  const targetsTotal = state.targetSequence.length;
  const hitRatePct = dartsThrown > 0 ? (targetsHit / dartsThrown) * 100 : null;

  const lastEvent = events[events.length - 1];
  const durationMs = lastEvent
    ? new Date(lastEvent.timestamp).getTime() - new Date(session.startedAt).getTime()
    : 0;

  return {
    targetsHit,
    targetsTotal,
    dartsThrown,
    hitRatePct,
    durationMs,
    byParticipant: session.participants.length > 1 ? byParticipant : undefined
  };
}

export function computeRtwScoringStats(
  events: GameEvent[],
  config: RtwScoringConfig,
  session: SessionShape
): RtwScoringSessionStats {
  const state = buildRtwScoringState(events, config, session.participants, session.id);

  const byParticipant: Record<string, RtwScoringParticipantStats> = {};
  for (const pid of session.participants) {
    const myTurns = state.turns.filter((t) => t.participantId === pid);
    const dartsThrown = myTurns.reduce((s, t) => s + t.darts.length, 0);
    const targetsHit = myTurns.filter((t) => t.darts.some((d) => d.score > 0)).length;
    const totalScore = state.participantScores[pid] ?? 0;
    byParticipant[pid] = { totalScore, targetsHit, dartsThrown };
  }

  // Overall stats for single-player compat
  const activePid = state.activeParticipantId;
  const myTurns = state.turns.filter((t) => t.participantId === activePid);
  const dartsThrown = myTurns.reduce((s, t) => s + t.darts.length, 0);
  const targetsHit = myTurns.filter((t) => t.darts.some((d) => d.score > 0)).length;
  const targetsTotal = state.targetSequence.length;

  const lastEvent = events[events.length - 1];
  const durationMs = lastEvent
    ? new Date(lastEvent.timestamp).getTime() - new Date(session.startedAt).getTime()
    : 0;

  return {
    targetsHit,
    targetsTotal,
    dartsThrown,
    totalScore: state.totalScore,
    durationMs,
    byParticipant: session.participants.length > 1 ? byParticipant : undefined
  };
}
