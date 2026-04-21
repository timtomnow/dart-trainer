import type { RtwConfig } from './config';
import {
  advancesOnHit,
  alwaysAdvances,
  dartsPerTurn,
  getTargetSequence,
  hitsRequiredToAdvance,
  isHit
} from './rules';
import type { RtwDart, RtwState, RtwStatus, RtwTurn } from './types';
import type { GameEvent, ThrowSegment } from '@/domain/types';

type ThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
};

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

    const p = ev.payload as ThrowPayload;
    const hit = isHit(p.segment, p.value, target, config.gameType);

    if (!currentTurn || currentTurn.closed) {
      currentTurn = {
        participantId: p.participantId,
        darts: [],
        closed: false,
        advanced: false,
        targetIndexAtStart: targetIndex
      };
      turns.push(currentTurn);
      dartsInTurn = 0;
      hitsInTurn = 0;
    }

    const dart: RtwDart = {
      eventId: ev.id,
      segment: p.segment,
      value: p.value,
      targetIndex,
      isHit: hit
    };
    currentTurn.darts.push(dart);

    if (hit) hitsInTurn++;

    // 'Hit once': advance target immediately on hit, remaining darts go to next target
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
    activeParticipantId: participantIds[0]!,
    winnerParticipantId
  };
}
