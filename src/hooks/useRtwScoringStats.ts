import { useMemo } from 'react';
import { useFilteredSessionStats } from './useFilteredSessionStats';
import type { RtwScoringOrder } from '@/games/rtw-scoring/config';
import { DEFAULT_FILTER, type StatsFilter } from '@/stats/filter';
import {
  aggregateRtwScoringDetail,
  computeRtwScoringDetail,
  deriveRtwOrders,
  type RtwScoringAggregate,
  type RtwScoringSessionData
} from '@/stats/rtwScoringDetail';

export type UseRtwScoringStatsResult = {
  loading: boolean;
  orders: RtwScoringOrder[];
  aggregate: RtwScoringAggregate | null;
};

function looksLikeDetail(cached: RtwScoringSessionData): boolean {
  return typeof cached.order === 'string' && typeof cached.byParticipant === 'object';
}

export function useRtwScoringStats(
  profileId: string | null,
  filter: StatsFilter = DEFAULT_FILTER,
  orderFilter?: RtwScoringOrder
): UseRtwScoringStatsResult {
  const { loading, pairs } = useFilteredSessionStats<RtwScoringSessionData>(
    'rtw-scoring',
    profileId,
    filter,
    (events, session) => computeRtwScoringDetail(events, session),
    looksLikeDetail
  );

  const sessions = useMemo(() => pairs.map((p) => p.stats), [pairs]);
  const orders = useMemo(() => deriveRtwOrders(sessions), [sessions]);
  const aggregate = useMemo(
    () => (profileId ? aggregateRtwScoringDetail(sessions, profileId, orderFilter) : null),
    [sessions, profileId, orderFilter]
  );

  return { loading, orders, aggregate };
}
