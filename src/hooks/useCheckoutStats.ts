import { useMemo } from 'react';
import { useFilteredSessionStats } from './useFilteredSessionStats';
import { parseCheckoutConfig } from '@/games/checkout/config';
import { computeCheckoutStats } from '@/stats/checkoutStats';
import { DEFAULT_FILTER, type StatsFilter } from '@/stats/filter';
import type { CheckoutSessionStats } from '@/stats/types';

export type CheckoutAggStats = {
  sessionCount: number;
  avgSuccessRate: number | null;
  bestHardestFinish: number | null;
  avgAttemptsPerSession: number;
};

export type UseCheckoutStatsResult = {
  loading: boolean;
  sessions: CheckoutSessionStats[];
  agg: CheckoutAggStats | null;
};

function aggregate(all: CheckoutSessionStats[]): CheckoutAggStats | null {
  if (all.length === 0) return null;
  const withRate = all.filter((s) => s.successRate !== null);
  const avgSuccessRate =
    withRate.length > 0
      ? withRate.reduce((s, x) => s + x.successRate!, 0) / withRate.length
      : null;
  const hardestValues = all
    .map((s) => s.hardestFinishHit)
    .filter((v): v is number => v !== null);
  const bestHardestFinish = hardestValues.length > 0 ? Math.max(...hardestValues) : null;
  const avgAttemptsPerSession =
    all.reduce((s, x) => s + x.totalAttempts, 0) / all.length;
  return { sessionCount: all.length, avgSuccessRate, bestHardestFinish, avgAttemptsPerSession };
}

export function useCheckoutStats(
  profileId: string | null,
  filter: StatsFilter = DEFAULT_FILTER
): UseCheckoutStatsResult {
  const { loading, pairs } = useFilteredSessionStats<CheckoutSessionStats>(
    'checkout',
    profileId,
    filter,
    (events, session) => {
      let config;
      try {
        config = parseCheckoutConfig(session.gameConfig);
      } catch {
        return null;
      }
      return computeCheckoutStats(events, config, session);
    }
  );

  const sessions = useMemo(() => pairs.map((p) => p.stats), [pairs]);
  const agg = useMemo(() => aggregate(sessions), [sessions]);

  return { loading, sessions, agg };
}
