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

  const turns: RtwTurn[] = [];
  let targetIndex = 0;
  let dartsInTurn = 0;
  let hitsInTurn = 0;
  let status: RtwStatus = 'in_progress';
  let winnerParticipantId: string | undefined;
  let currentTurn: RtwTurn | null = null;

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

    const p = ev.payload as RtwThrowPayload;

    if ('hit' in p) {
      // Group A: one dart per event ('Hit once', '1-dart per target')
      if (!currentTurn || currentTurn.closed) {
        currentTurn = {
          participantId: p.participantId,
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

      // 'Hit once': advance target immediately on hit; remaining darts go to next target
      if (advOnHit && p.hit) {
        currentTurn.advanced = true;
        targetIndex++;
        if (targetIndex >= targetSequence.length) {
          currentTurn.dartsInTurn = dartsInTurn + 1;
          currentTurn.closed = true;
          winnerParticipantId = p.participantId;
          status = 'completed';
          break;
        }
      }

      dartsInTurn++;

      if (dartsInTurn >= dpt) {
        if (!advOnHit) {
          // '1-dart per target': always advances
          if (alwaysAdv) {
            currentTurn.advanced = true;
            targetIndex++;
            if (targetIndex >= targetSequence.length) {
              winnerParticipantId = p.participantId;
              status = 'completed';
            }
          }
        }
        currentTurn.dartsInTurn = dartsInTurn;
        currentTurn.closed = true;
        dartsInTurn = 0;
        hitsInTurn = 0;
      }
    } else {
      // Group B: one turn per event ('3 darts per target', '3-darts until hit N')
      const ht = p.hitsInTurn;
      const advances = alwaysAdv || ht >= hitsRequired;

      const turn: RtwTurn = {
        participantId: p.participantId,
        targetIndexAtStart: targetIndex,
        hitsInTurn: ht,
        dartsInTurn: 3,
        closed: true,
        advanced: advances
      };
      turns.push(turn);
      currentTurn = turn;

      if (advances) {
        targetIndex++;
        if (targetIndex >= targetSequence.length) {
          winnerParticipantId = p.participantId;
          status = 'completed';
        }
      }

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
    activeParticipantId: participantIds[0]!,
    winnerParticipantId
  };
}
