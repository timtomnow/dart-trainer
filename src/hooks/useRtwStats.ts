import { useMemo } from 'react';
import { useFilteredSessionStats } from './useFilteredSessionStats';
import { DEFAULT_FILTER, type StatsFilter } from '@/stats/filter';
import {
  aggregateRtwDetail,
  computeRtwDetail,
  deriveRtwAvailable,
  type RtwAggregate,
  type RtwAvailable,
  type RtwConfigFilter,
  type RtwSessionData
} from '@/stats/rtwDetail';

export type UseRtwStatsResult = {
  loading: boolean;
  available: RtwAvailable;
  aggregate: RtwAggregate | null;
};

function looksLikeDetail(cached: RtwSessionData): boolean {
  return typeof cached.mode === 'string' && typeof cached.byParticipant === 'object';
}

export function useRtwStats(
  profileId: string | null,
  filter: StatsFilter = DEFAULT_FILTER,
  configFilter: RtwConfigFilter = {}
): UseRtwStatsResult {
  const { loading, pairs } = useFilteredSessionStats<RtwSessionData>(
    'rtw',
    profileId,
    filter,
    (events, session) => computeRtwDetail(events, session),
    looksLikeDetail
  );

  const sessions = useMemo(() => pairs.map((p) => p.stats), [pairs]);
  const available = useMemo(() => deriveRtwAvailable(sessions), [sessions]);

  const configKey = JSON.stringify(configFilter);
  const aggregate = useMemo(
    () => (profileId ? aggregateRtwDetail(sessions, profileId, configFilter) : null),
    // configFilter captured via configKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, profileId, configKey]
  );

  return { loading, available, aggregate };
}
