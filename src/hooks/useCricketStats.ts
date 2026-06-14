import { useMemo } from 'react';
import { useFilteredSessionStats } from './useFilteredSessionStats';
import {
  aggregateCricketDetail,
  computeCricketDetail,
  type CricketAggregate,
  type CricketSessionData
} from '@/stats/cricketDetail';
import { DEFAULT_FILTER, type StatsFilter } from '@/stats/filter';

export type UseCricketStatsResult = {
  loading: boolean;
  aggregate: CricketAggregate | null;
};

function looksLikeDetail(cached: CricketSessionData): boolean {
  return Array.isArray(cached.legs) && typeof cached.forfeited === 'boolean';
}

export function useCricketStats(
  profileId: string | null,
  filter: StatsFilter = DEFAULT_FILTER
): UseCricketStatsResult {
  const { loading, pairs } = useFilteredSessionStats<CricketSessionData>(
    'cricket',
    profileId,
    filter,
    (events, session) => computeCricketDetail(events, session),
    looksLikeDetail
  );

  const sessions = useMemo(() => pairs.map((p) => p.stats), [pairs]);
  const aggregate = useMemo(
    () => (profileId ? aggregateCricketDetail(sessions, profileId) : null),
    [sessions, profileId]
  );

  return { loading, aggregate };
}
