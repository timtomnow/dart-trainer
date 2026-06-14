import { useMemo } from 'react';
import { useFilteredSessionStats } from './useFilteredSessionStats';
import { DEFAULT_FILTER, type StatsFilter } from '@/stats/filter';
import {
  aggregateX01Legs,
  computeX01SessionLegs,
  deriveAvailableConfigs,
  type X01AvailableConfigs,
  type X01ConfigFilter,
  type X01LegAggregate,
  type X01SessionLegs
} from '@/stats/x01Legs';

export type UseX01StatsResult = {
  loading: boolean;
  available: X01AvailableConfigs;
  aggregate: X01LegAggregate | null;
};

function looksLikeSessionLegs(cached: X01SessionLegs): boolean {
  return Array.isArray(cached.legs) && typeof cached.startScore === 'number';
}

export function useX01Stats(
  profileId: string | null,
  filter: StatsFilter = DEFAULT_FILTER,
  gameModeId: 'x01' | 'x01vc' = 'x01',
  configFilter: X01ConfigFilter = {}
): UseX01StatsResult {
  const { loading, pairs } = useFilteredSessionStats<X01SessionLegs>(
    gameModeId,
    profileId,
    filter,
    (events, session) => computeX01SessionLegs(events, session, gameModeId),
    looksLikeSessionLegs
  );

  const sessions = useMemo(() => pairs.map((p) => p.stats), [pairs]);

  const available = useMemo(() => deriveAvailableConfigs(sessions), [sessions]);

  const configKey = JSON.stringify(configFilter);
  const aggregate = useMemo(
    () => (profileId ? aggregateX01Legs(sessions, profileId, configFilter) : null),
    // configFilter captured via configKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, profileId, configKey]
  );

  return { loading, available, aggregate };
}
