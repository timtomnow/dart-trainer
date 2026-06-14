import { useMemo } from 'react';
import { useFilteredSessionStats } from './useFilteredSessionStats';
import {
  aggregateCheckoutDetail,
  computeCheckoutDetail,
  type CheckoutAggregate,
  type CheckoutSessionData
} from '@/stats/checkoutDetail';
import { DEFAULT_FILTER, type StatsFilter } from '@/stats/filter';

export type UseCheckoutStatsResult = {
  loading: boolean;
  aggregate: CheckoutAggregate | null;
};

function looksLikeDetail(cached: CheckoutSessionData): boolean {
  return typeof cached.perFinish === 'object' && typeof cached.totalAttempts === 'number';
}

export function useCheckoutStats(
  profileId: string | null,
  filter: StatsFilter = DEFAULT_FILTER
): UseCheckoutStatsResult {
  const { loading, pairs } = useFilteredSessionStats<CheckoutSessionData>(
    'checkout',
    profileId,
    filter,
    (events, session) => computeCheckoutDetail(events, session),
    looksLikeDetail
  );

  const sessions = useMemo(() => pairs.map((p) => p.stats), [pairs]);
  const aggregate = useMemo(() => aggregateCheckoutDetail(sessions), [sessions]);

  return { loading, aggregate };
}
