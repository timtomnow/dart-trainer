import type { CheckoutPerFinishStats, CheckoutSessionStats } from './types';
import type { GameEvent, Session } from '@/domain/types';
import type { CheckoutConfig } from '@/games/checkout/config';
import { buildCheckoutState } from '@/games/checkout/replay';

type SessionShape = Pick<Session, 'id' | 'participants' | 'startedAt'>;

export function computeCheckoutStats(
  events: GameEvent[],
  config: CheckoutConfig,
  session: SessionShape
): CheckoutSessionStats {
  const state = buildCheckoutState(events, config, session.participants, session.id);

  const perFinishMap = new Map<number, CheckoutPerFinishStats>();
  const dartsTaken: number[] = [];

  for (const attempt of state.attempts) {
    const finish = attempt.targetFinish;
    if (!perFinishMap.has(finish)) {
      perFinishMap.set(finish, {
        finish,
        attempts: 0,
        successes: 0,
        successRate: null,
        bestDarts: null
      });
    }
    const pf = perFinishMap.get(finish)!;
    pf.attempts++;
    if (attempt.success) {
      pf.successes++;
      const darts = attempt.darts.length;
      dartsTaken.push(darts);
      if (pf.bestDarts === null || darts < pf.bestDarts) pf.bestDarts = darts;
    }
  }

  for (const pf of perFinishMap.values()) {
    pf.successRate = pf.attempts > 0 ? (pf.successes / pf.attempts) * 100 : null;
  }

  const perFinish = Array.from(perFinishMap.values());
  const successCount = state.attempts.filter((a) => a.success).length;
  const totalAttempts = state.attempts.length;
  const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : null;
  const avgDartsOnSuccess =
    dartsTaken.length > 0 ? dartsTaken.reduce((s, n) => s + n, 0) / dartsTaken.length : null;

  const hardestFinishHit = state.attempts
    .filter((a) => a.success)
    .reduce<number | null>((max, a) => (max === null || a.targetFinish > max ? a.targetFinish : max), null);

  const lastEvent = events[events.length - 1];
  const durationMs = lastEvent
    ? new Date(lastEvent.timestamp).getTime() - new Date(session.startedAt).getTime()
    : 0;

  return {
    successRate,
    successCount,
    totalAttempts,
    perFinish,
    dartsTaken,
    avgDartsOnSuccess,
    hardestFinishHit,
    durationMs
  };
}
