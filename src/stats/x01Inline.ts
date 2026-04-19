import type { X01Config } from '@/games/x01/config';
import type { X01Leg, X01LegStats, X01Turn } from '@/games/x01/types';

const CHECKOUT_THRESHOLD = 170;

function turnWasCheckoutOpportunity(
  turn: X01Turn,
  config: X01Config
): boolean {
  if (turn.startRemaining <= 0) return false;
  if (turn.startRemaining > CHECKOUT_THRESHOLD) return false;
  if (config.outRule === 'straight') return true;
  if (turn.startRemaining === 1) return false;
  return true;
}

function turnDarts(turn: X01Turn): number {
  return turn.darts.length;
}

function turnScored(turn: X01Turn): number {
  return turn.scored;
}

export function computeX01LegStats(
  leg: X01Leg | undefined,
  participantId: string,
  config: X01Config
): X01LegStats {
  const empty: X01LegStats = {
    threeDartAvg: 0,
    firstNineAvg: null,
    checkoutPct: null,
    highestFinish: 0,
    dartsThrown: 0,
    scoredTotal: 0
  };
  if (!leg) return empty;

  const turns = leg.turns.filter((t) => t.participantId === participantId);
  if (turns.length === 0) return empty;

  let dartsThrown = 0;
  let scoredTotal = 0;
  let first9Scored = 0;
  let first9Darts = 0;
  let checkoutOpps = 0;
  let checkouts = 0;
  let highestFinish = 0;

  for (const turn of turns) {
    const darts = turnDarts(turn);
    const scored = turnScored(turn);
    dartsThrown += darts;
    scoredTotal += scored;

    if (first9Darts < 9) {
      const take = Math.min(darts, 9 - first9Darts);
      first9Darts += take;
      if (take === darts) first9Scored += scored;
      else {
        let s = 0;
        for (let i = 0; i < take; i += 1) s += turn.darts[i]!.scored;
        first9Scored += s;
      }
    }

    if (turnWasCheckoutOpportunity(turn, config)) {
      checkoutOpps += 1;
      if (turn.checkout) checkouts += 1;
    }

    if (turn.checkout) {
      if (turn.startRemaining > highestFinish) highestFinish = turn.startRemaining;
    }
  }

  const threeDartAvg = dartsThrown > 0 ? (scoredTotal / dartsThrown) * 3 : 0;
  const firstNineAvg = first9Darts >= 9 ? (first9Scored / 9) * 3 : null;
  const checkoutPct = checkoutOpps > 0 ? (checkouts / checkoutOpps) * 100 : null;

  return {
    threeDartAvg,
    firstNineAvg,
    checkoutPct,
    highestFinish,
    dartsThrown,
    scoredTotal
  };
}
