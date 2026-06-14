import { useMemo } from 'react';
import { useFilteredSessionStats } from './useFilteredSessionStats';
import { parseCricketConfig } from '@/games/cricket/config';
import { computeCricketStats } from '@/stats/cricketStats';
import { DEFAULT_FILTER, type StatsFilter } from '@/stats/filter';
import type { CricketSessionStats } from '@/stats/types';

export type CricketAggStats = {
  sessionCount: number;
  marksPerRound: number;
  totalMarks: number;
};

export type UseCricketStatsResult = {
  loading: boolean;
  aggregate: CricketAggStats | null;
};

function aggregate(all: CricketSessionStats[]): CricketAggStats | null {
  if (all.length === 0) return null;
  const totalMarks = all.reduce((s, x) => s + x.totalMarks, 0);
  const marksPerRound = all.reduce((s, x) => s + x.marksPerRound, 0) / all.length;
  return { sessionCount: all.length, marksPerRound, totalMarks };
}

export function useCricketStats(
  profileId: string | null,
  filter: StatsFilter = DEFAULT_FILTER
): UseCricketStatsResult {
  const { loading, pairs } = useFilteredSessionStats<CricketSessionStats>(
    'cricket',
    profileId,
    filter,
    (events, session) => {
      let config;
      try {
        config = parseCricketConfig(session.gameConfig);
      } catch {
        return null;
      }
      return computeCricketStats(events, config, session);
    }
  );

  const agg = useMemo(() => aggregate(pairs.map((p) => p.stats)), [pairs]);

  return { loading, aggregate: agg };
}
