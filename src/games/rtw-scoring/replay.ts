import type { RtwScoringConfig } from './config';
import { dartScore, getTargetSequence, isInvalidForTarget } from './rules';
import type {
  RtwScoringDart,
  RtwScoringMultiplier,
  RtwScoringState,
  RtwScoringStatus,
  RtwScoringTurn
} from './types';
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

  const participantScores: Record<string, number> = {};
  for (const p of participantIds) participantScores[p] = 0;

  const turns: RtwScoringTurn[] = [];
  let targetIndex = 0;
  let dartsInTurn = 0;
  // how many participants have completed their turn at the current target
  let turnsAtCurrentTarget = 0;
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

    const activeParticipantId = participantIds[turnsAtCurrentTarget % participantIds.length]!;
    const p = ev.payload as ThrowPayload;

    if (isInvalidForTarget(p.multiplier, target)) continue;

    if (!currentTurn || currentTurn.closed) {
      currentTurn = {
        participantId: activeParticipantId,
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
    participantScores[activeParticipantId]! += score;

    dartsInTurn++;

    if (dartsInTurn >= 3) {
      currentTurn.advanced = true;
      currentTurn.closed = true;
      turnsAtCurrentTarget++;

      if (turnsAtCurrentTarget >= participantIds.length) {
        // All players done at this target — advance
        turnsAtCurrentTarget = 0;
        targetIndex++;

        if (targetIndex >= targetSequence.length) {
          // Find the winner by highest score
          let maxScore = -1;
          for (const [pid, s] of Object.entries(participantScores)) {
            if (s > maxScore) {
              maxScore = s;
              winnerParticipantId = pid;
            }
          }
          status = 'completed';
        }
      }

      dartsInTurn = 0;
    }

    if (status === 'completed') break;
  }

  const activeParticipantId = participantIds[turnsAtCurrentTarget % participantIds.length]!;
  const totalScore = participantScores[activeParticipantId] ?? 0;

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
    participantScores,
    totalScore,
    activeParticipantId,
    winnerParticipantId
  };
}
