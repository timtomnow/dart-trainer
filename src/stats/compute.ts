import type { X01ParticipantStats, X01SessionStats } from './types';
import type { GameEvent, Session } from '@/domain/types';
import type { X01Config } from '@/games/x01/config';
import { buildX01State } from '@/games/x01/replay';
import type { X01Turn } from '@/games/x01/types';

type SessionShape = Pick<Session, 'id' | 'participants' | 'startedAt'>;

export function computeSessionStats(
  events: GameEvent[],
  config: X01Config,
  session: SessionShape
): X01SessionStats {
  const state = buildX01State(events, config, session.participants, session.id);

  let totalScored = 0;
  let dartsThrown = 0;
  let count180 = 0;
  let count171plus = 0;
  let count160plus = 0;
  let count140plus = 0;
  let count120plus = 0;
  let count100plus = 0;
  let count80plus = 0;
  let count60plus = 0;
  let highestTurnScore = 0;
  let highestCheckout = 0;
  let busts = 0;
  let checkoutOpportunities = 0;
  let checkoutHits = 0;
  let shortestLeg: number | null = null;
  let firstNineScored = 0;
  let closedTurnCount = 0;

  for (const leg of state.legs) {
    let legWinnerDarts = 0;

    for (const turn of leg.turns) {
      if (!turn.closed) continue;

      const dartCount = turn.darts.length;
      dartsThrown += dartCount;

      if (leg.winnerParticipantId && turn.participantId === leg.winnerParticipantId) {
        legWinnerDarts += dartCount;
      }

      if (turn.startRemaining <= 170) {
        checkoutOpportunities++;
        if (turn.checkout) checkoutHits++;
      }

      if (turn.bust) {
        busts++;
      } else {
        totalScored += turn.scored;

        if (turn.scored > highestTurnScore) highestTurnScore = turn.scored;
        if (turn.scored >= 60) count60plus++;
        if (turn.scored >= 80) count80plus++;
        if (turn.scored >= 100) count100plus++;
        if (turn.scored >= 120) count120plus++;
        if (turn.scored >= 140) count140plus++;
        if (turn.scored >= 160) count160plus++;
        if (turn.scored >= 171) count171plus++;
        if (turn.scored === 180) count180++;
      }

      if (turn.checkout && turn.startRemaining > highestCheckout) {
        highestCheckout = turn.startRemaining;
      }

      if (closedTurnCount < 3) {
        firstNineScored += turn.scored;
      }
      closedTurnCount++;
    }

    if (leg.winnerParticipantId !== undefined) {
      if (shortestLeg === null || legWinnerDarts < shortestLeg) {
        shortestLeg = legWinnerDarts;
      }
    }
  }

  const threeDartAvg = dartsThrown > 0 ? (totalScored / dartsThrown) * 3 : 0;
  const firstNineAvg = closedTurnCount >= 3 ? firstNineScored / 3 : null;
  const checkoutPct = checkoutOpportunities > 0 ? checkoutHits / checkoutOpportunities : null;

  const lastEvent = events[events.length - 1];
  const durationMs = lastEvent
    ? new Date(lastEvent.timestamp).getTime() - new Date(session.startedAt).getTime()
    : 0;

  const byParticipant =
    session.participants.length > 1
      ? computeX01ByParticipant(state.legs.flatMap((l) => l.turns), session.participants, config)
      : undefined;

  return {
    threeDartAvg,
    firstNineAvg,
    checkoutPct,
    dartsThrown,
    count180,
    count171plus,
    count160plus,
    count140plus,
    count120plus,
    count100plus,
    count80plus,
    count60plus,
    highestTurnScore,
    highestCheckout,
    shortestLeg,
    busts,
    durationMs,
    byParticipant
  };
}

function computeX01ByParticipant(
  allTurns: X01Turn[],
  participantIds: string[],
  config: X01Config
): Record<string, X01ParticipantStats> {
  const result: Record<string, X01ParticipantStats> = {};
  for (const pid of participantIds) {
    const turns = allTurns.filter((t) => t.participantId === pid && t.closed);
    let pDarts = 0;
    let pScored = 0;
    let pFirst9Scored = 0;
    let pFirst9Darts = 0;
    let pCheckoutOpps = 0;
    let pCheckoutHits = 0;
    let pHighestTurn = 0;
    let pHighestCheckout = 0;
    let p180 = 0;
    let pBusts = 0;

    for (const turn of turns) {
      pDarts += turn.darts.length;
      if (turn.bust) {
        pBusts++;
      } else {
        pScored += turn.scored;
        if (turn.scored > pHighestTurn) pHighestTurn = turn.scored;
        if (turn.scored === 180) p180++;
      }
      if (turn.startRemaining <= 170) {
        pCheckoutOpps++;
        if (turn.checkout) pCheckoutHits++;
      }
      if (turn.checkout && turn.startRemaining > pHighestCheckout) {
        pHighestCheckout = turn.startRemaining;
      }
      if (pFirst9Darts < 9) {
        const take = Math.min(turn.darts.length, 9 - pFirst9Darts);
        pFirst9Darts += take;
        if (take === turn.darts.length) {
          pFirst9Scored += turn.scored;
        } else {
          for (let i = 0; i < take; i++) pFirst9Scored += turn.darts[i]!.scored;
        }
      }
    }

    const pAvg = pDarts > 0 ? (pScored / pDarts) * 3 : 0;
    const pF9 = pFirst9Darts >= 9 ? pFirst9Scored / 3 : null;
    const pCo = pCheckoutOpps > 0 ? pCheckoutHits / pCheckoutOpps : null;
    void config;

    result[pid] = {
      threeDartAvg: pAvg,
      firstNineAvg: pF9,
      checkoutPct: pCo,
      dartsThrown: pDarts,
      count180: p180,
      highestTurnScore: pHighestTurn,
      highestCheckout: pHighestCheckout,
      busts: pBusts
    };
  }
  return result;
}
