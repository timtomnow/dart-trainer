import type { RtwConfig } from './config';
import {
  advancesOnHit,
  alwaysAdvances,
  dartsPerTurn,
  getTargetSequence,
  hitsRequiredToAdvance
} from './rules';
import type { RtwState, RtwStatus, RtwThrowPayload, RtwTurn } from './types';
import type { GameEvent } from '@/domain/types';

export function buildRtwState(
  events: GameEvent[],
  config: RtwConfig,
  participantIds: string[],
  sessionId: string
): RtwState {
  const targetSequence = getTargetSequence(config);
  const dpt = dartsPerTurn(config.mode);
  const advOnHit = advancesOnHit(config.mode);
  const alwaysAdv = alwaysAdvances(config.mode);
  const hitsRequired = hitsRequiredToAdvance(config.mode);

  const participantTargetIndices: Record<string, number> = {};
  for (const p of participantIds) participantTargetIndices[p] = 0;

  const turns: RtwTurn[] = [];
  let dartsInTurn = 0;
  let hitsInTurn = 0;
  let status: RtwStatus = 'in_progress';
  let winnerParticipantId: string | undefined;
  let currentTurn: RtwTurn | null = null;
  let participantRotation = 0;

  for (const ev of events) {
    if (status !== 'in_progress') break;
    if (ev.type === 'note') continue;

    if (ev.type === 'forfeit') {
      status = 'forfeited';
      continue;
    }

    if (ev.type !== 'throw') continue;

    const activeParticipantId = participantIds[participantRotation]!;
    const targetIndex = participantTargetIndices[activeParticipantId]!;
    const target = targetSequence[targetIndex];
    if (target === undefined) break;

    const p = ev.payload as RtwThrowPayload;

    if ('hit' in p) {
      // Group A: one dart per event ('Hit once', '1-dart per target')
      if (!currentTurn || currentTurn.closed) {
        currentTurn = {
          participantId: activeParticipantId,
          targetIndexAtStart: targetIndex,
          hitsInTurn: 0,
          dartsInTurn: 0,
          closed: false,
          advanced: false
        };
        turns.push(currentTurn);
        dartsInTurn = 0;
        hitsInTurn = 0;
      }

      if (p.hit) {
        hitsInTurn++;
        currentTurn.hitsInTurn++;
      }

      if (advOnHit && p.hit) {
        currentTurn.advanced = true;
        participantTargetIndices[activeParticipantId]!++;
        if (participantTargetIndices[activeParticipantId]! >= targetSequence.length) {
          currentTurn.dartsInTurn = dartsInTurn + 1;
          currentTurn.closed = true;
          winnerParticipantId = activeParticipantId;
          status = 'completed';
          break;
        }
      }

      dartsInTurn++;

      if (dartsInTurn >= dpt) {
        if (!advOnHit && alwaysAdv) {
          currentTurn.advanced = true;
          participantTargetIndices[activeParticipantId]!++;
          if (participantTargetIndices[activeParticipantId]! >= targetSequence.length) {
            winnerParticipantId = activeParticipantId;
            status = 'completed';
          }
        }
        currentTurn.dartsInTurn = dartsInTurn;
        currentTurn.closed = true;

        if (status !== 'completed') {
          participantRotation = (participantRotation + 1) % participantIds.length;
        }
        dartsInTurn = 0;
        hitsInTurn = 0;
        currentTurn = null;
      }
    } else {
      // Group B: one turn per event ('3 darts per target', '3-darts until hit N')
      const ht = p.hitsInTurn;
      const advances = alwaysAdv || ht >= hitsRequired;

      const turn: RtwTurn = {
        participantId: activeParticipantId,
        targetIndexAtStart: targetIndex,
        hitsInTurn: ht,
        dartsInTurn: 3,
        closed: true,
        advanced: advances
      };
      turns.push(turn);
      currentTurn = turn;

      if (advances) {
        participantTargetIndices[activeParticipantId]!++;
        if (participantTargetIndices[activeParticipantId]! >= targetSequence.length) {
          winnerParticipantId = activeParticipantId;
          status = 'completed';
        }
      }

      if (status !== 'completed') {
        participantRotation = (participantRotation + 1) % participantIds.length;
      }
      dartsInTurn = 0;
      hitsInTurn = 0;
    }

    if (status === 'completed') break;
  }

  const activeParticipantId = participantIds[participantRotation]!;
  const currentTargetIndex = participantTargetIndices[activeParticipantId] ?? 0;

  return {
    sessionId,
    participantIds,
    config,
    status,
    inputEventLog: events.filter(
      (e) => e.type === 'throw' || e.type === 'forfeit' || e.type === 'note'
    ),
    targetSequence,
    participantTargetIndices,
    currentTargetIndex,
    dartsInCurrentTurn: dartsInTurn,
    hitsInCurrentTurn: hitsInTurn,
    turns,
    activeParticipantId,
    winnerParticipantId
  };
}
