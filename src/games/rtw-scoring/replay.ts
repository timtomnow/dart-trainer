import type { RtwScoringConfig } from './config';
import {
  advancesOnHit,
  alwaysAdvances,
  dartScore,
  dartsPerTurn,
  getTargetSequence,
  hitsRequiredToAdvance,
  isHit
} from './rules';
import type { RtwScoringDart, RtwScoringState, RtwScoringStatus, RtwScoringTurn } from './types';
import type { GameEvent, ThrowSegment } from '@/domain/types';

type ThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
};

export function buildRtwScoringState(
  events: GameEvent[],
  config: RtwScoringConfig,
  participantIds: string[],
  sessionId: string
): RtwScoringState {
  const targetSequence = getTargetSequence(config);
  const dpt = dartsPerTurn(config.mode);
  const advOnHit = advancesOnHit(config.mode);
  const alwaysAdv = alwaysAdvances(config.mode);
  const hitsRequired = hitsRequiredToAdvance(config.mode);

  const turns: RtwScoringTurn[] = [];
  let targetIndex = 0;
  let dartsInTurn = 0;
  let hitsInTurn = 0;
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
    const hit = isHit(p.segment, p.value, target, config.gameType);
    const scored = dartScore(p.segment, p.value, target);

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
      hitsInTurn = 0;
    }

    const dart: RtwScoringDart = {
      eventId: ev.id,
      segment: p.segment,
      value: p.value,
      targetIndex,
      isHit: hit,
      scored
    };
    currentTurn.darts.push(dart);
    currentTurn.turnScore += scored;
    totalScore += scored;

    if (hit) hitsInTurn++;

    if (advOnHit && hit) {
      currentTurn.advanced = true;
      targetIndex++;
      if (targetIndex >= targetSequence.length) {
        currentTurn.closed = true;
        winnerParticipantId = p.participantId;
        status = 'completed';
        break;
      }
    }

    dartsInTurn++;

    if (dartsInTurn >= dpt) {
      if (!advOnHit) {
        const advances = alwaysAdv || hitsInTurn >= hitsRequired;
        if (advances) {
          currentTurn.advanced = true;
          targetIndex++;
          if (targetIndex >= targetSequence.length) {
            winnerParticipantId = p.participantId;
            status = 'completed';
          }
        }
      }
      currentTurn.closed = true;
      dartsInTurn = 0;
      hitsInTurn = 0;
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
    hitsInCurrentTurn: hitsInTurn,
    turns,
    totalScore,
    activeParticipantId: participantIds[0]!,
    winnerParticipantId
  };
}
