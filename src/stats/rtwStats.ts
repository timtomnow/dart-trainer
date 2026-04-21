import type { RtwScoringSessionStats, RtwSessionStats } from './types';
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

  let dartsThrown = 0;
  let targetsHit = 0;

  for (const turn of state.turns) {
    dartsThrown += turn.darts.length;
    if (turn.darts.some((d) => d.isHit)) targetsHit++;
  }

  const targetsTotal = state.targetSequence.length;
  const hitRatePct =
    state.currentTargetIndex > 0
      ? (targetsHit / state.currentTargetIndex) * 100
      : null;

  const lastEvent = events[events.length - 1];
  const durationMs = lastEvent
    ? new Date(lastEvent.timestamp).getTime() - new Date(session.startedAt).getTime()
    : 0;

  return { targetsHit, targetsTotal, dartsThrown, hitRatePct, durationMs };
}

export function computeRtwScoringStats(
  events: GameEvent[],
  config: RtwScoringConfig,
  session: SessionShape
): RtwScoringSessionStats {
  const state = buildRtwScoringState(events, config, session.participants, session.id);

  let dartsThrown = 0;
  let targetsHit = 0;

  for (const turn of state.turns) {
    dartsThrown += turn.darts.length;
    if (turn.darts.some((d) => d.isHit)) targetsHit++;
  }

  const targetsTotal = state.targetSequence.length;
  const hitRatePct =
    state.currentTargetIndex > 0
      ? (targetsHit / state.currentTargetIndex) * 100
      : null;

  const lastEvent = events[events.length - 1];
  const durationMs = lastEvent
    ? new Date(lastEvent.timestamp).getTime() - new Date(session.startedAt).getTime()
    : 0;

  return { targetsHit, targetsTotal, dartsThrown, hitRatePct, durationMs, totalScore: state.totalScore };
}
