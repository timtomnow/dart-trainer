import type { RtwScoringConfig } from './config';
import { dartScore, getTargetSequence, isInvalidForTarget } from './rules';
import type { RtwScoringDart, RtwScoringMultiplier, RtwScoringState, RtwScoringStatus, RtwScoringTurn } from './types';
import type { GameEvent } from '@/domain/types';

type ThrowPayload = {
  participantId: string;
  multiplier: RtwScoringMultiplier;
  targetIndex: number;
  targetValue: number;
  dartInTurn: number;
};

export function buildRtwScoringState(
  events: GameEvent[],
  config: RtwScoringConfig,
  participantIds: string[],
  sessionId: string
): RtwScoringState {
  const targetSequence = getTargetSequence(config);

  const turns: RtwScoringTurn[] = [];
  let targetIndex = 0;
  let dartsInTurn = 0;
  let totalScore = 0;
  let status: RtwScoringStatus = 'in_progress';
  let winnerParticipantId: string | undefined;
  let currentTurn: RtwScoringTurn | null = null;

  for (const ev of events) {
    if (status !== 'in_progress') break;
    if (ev.type === 'note') continue;

    if (ev.type === 'forfeit') {
      status = 'forfeited';
      continue;
    }

    if (ev.type !== 'throw') continue;

    const target = targetSequence[targetIndex];
    if (target === undefined) break;

    const p = ev.payload as ThrowPayload;

    // Triple bull is invalid — skip (engine guards this, but replay must tolerate missing events)
    if (isInvalidForTarget(p.multiplier, target)) continue;

    if (!currentTurn || currentTurn.closed) {
      currentTurn = {
        participantId: p.participantId,
        darts: [],
        closed: false,
        advanced: false,
        targetIndexAtStart: targetIndex,
        turnScore: 0
      };
      turns.push(currentTurn);
      dartsInTurn = 0;
    }

    const score = dartScore(p.multiplier);
    const dart: RtwScoringDart = {
      eventId: ev.id,
      multiplier: p.multiplier,
      score,
      targetIndex,
      targetValue: target
    };
    currentTurn.darts.push(dart);
    currentTurn.turnScore += score;
    totalScore += score;

    dartsInTurn++;

    if (dartsInTurn >= 3) {
      currentTurn.advanced = true;
      currentTurn.closed = true;
      targetIndex++;
      dartsInTurn = 0;

      if (targetIndex >= targetSequence.length) {
        winnerParticipantId = p.participantId;
        status = 'completed';
      }
    }

    if (status === 'completed') break;
  }

  return {
    sessionId,
    participantIds,
    config,
    status,
    inputEventLog: events.filter(
      (e) => e.type === 'throw' || e.type === 'forfeit' || e.type === 'note'
    ),
    targetSequence,
    currentTargetIndex: targetIndex,
    dartsInCurrentTurn: dartsInTurn,
    turns,
    totalScore,
    activeParticipantId: participantIds[0]!,
    winnerParticipantId
  };
}
