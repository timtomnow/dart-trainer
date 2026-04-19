import { computeX01LegStats } from './x01Inline';
import type { X01Config } from '@/games/x01/config';
import type { X01Leg, X01State, X01Turn } from '@/games/x01/types';

export type X01SessionStats = {
  threeDartAvg: number;
  firstNineAvg: number | null;
  checkoutPct: number | null;
  highestFinish: number;
  count180: number;
  dartsThrown: number;
  busts: number;
  legsWon: number;
};

function turnScore(turn: X01Turn): number {
  return turn.darts.reduce((s, d) => s + d.scored, 0);
}

function is180(turn: X01Turn): boolean {
  return turn.darts.length === 3 && turnScore(turn) === 180;
}

const CHECKOUT_THRESHOLD = 170;

function wasCheckoutOpportunity(turn: X01Turn, config: X01Config): boolean {
  if (turn.startRemaining <= 0 || turn.startRemaining > CHECKOUT_THRESHOLD) return false;
  if (config.outRule === 'straight') return true;
  return turn.startRemaining !== 1;
}

export function computeX01SessionStats(
  state: X01State,
  config: X01Config,
  participantId: string
): X01SessionStats {
  let dartsThrown = 0;
  let scoredTotal = 0;
  let first9Scored = 0;
  let first9Darts = 0;
  let checkoutOpps = 0;
  let checkouts = 0;
  let highestFinish = 0;
  let count180 = 0;
  let busts = 0;

  for (const leg of state.legs) {
    const myTurns = leg.turns.filter((t) => t.participantId === participantId);
    for (const turn of myTurns) {
      const darts = turn.darts.length;
      const scored = turnScore(turn);
      dartsThrown += darts;
      scoredTotal += scored;

      if (first9Darts < 9) {
        const take = Math.min(darts, 9 - first9Darts);
        if (take === darts) {
          first9Scored += scored;
        } else {
          let s = 0;
          for (let i = 0; i < take; i++) s += turn.darts[i]!.scored;
          first9Scored += s;
        }
        first9Darts += take;
      }

      if (wasCheckoutOpportunity(turn, config)) {
        checkoutOpps++;
        if (turn.checkout) checkouts++;
      }

      if (turn.checkout && turn.startRemaining > highestFinish) {
        highestFinish = turn.startRemaining;
      }

      if (is180(turn)) count180++;
      if (turn.bust) busts++;
    }
  }

  const legsWon = state.legsWon[participantId] ?? 0;
  const threeDartAvg = dartsThrown > 0 ? (scoredTotal / dartsThrown) * 3 : 0;
  const firstNineAvg = first9Darts >= 9 ? (first9Scored / 9) * 3 : null;
  const checkoutPct = checkoutOpps > 0 ? (checkouts / checkoutOpps) * 100 : null;

  return {
    threeDartAvg,
    firstNineAvg,
    checkoutPct,
    highestFinish,
    count180,
    dartsThrown,
    busts,
    legsWon
  };
}

export function computeX01LegBreakdowns(
  legs: X01Leg[],
  participantId: string,
  config: X01Config
): Array<{
  legIndex: number;
  winnerParticipantId: string | undefined;
  dartsUsed: number;
  checkoutValue: number;
  legStats: ReturnType<typeof computeX01LegStats>;
}> {
  return legs.map((leg) => {
    const myTurns = leg.turns.filter((t) => t.participantId === participantId);
    const dartsUsed = myTurns.reduce((s, t) => s + t.darts.length, 0);
    const checkoutTurn = myTurns.find((t) => t.checkout);
    return {
      legIndex: leg.index,
      winnerParticipantId: leg.winnerParticipantId,
      dartsUsed,
      checkoutValue: checkoutTurn?.startRemaining ?? 0,
      legStats: computeX01LegStats(leg, participantId, config)
    };
  });
}
