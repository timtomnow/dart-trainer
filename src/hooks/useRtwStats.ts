import { useMemo } from 'react';
import { useFilteredSessionStats, type SessionStatPair } from './useFilteredSessionStats';
import type { RtwGameType, RtwMode } from '@/games/rtw/config';
import { parseRtwConfig } from '@/games/rtw/config';
import type { RtwScoringOrder } from '@/games/rtw-scoring/config';
import { parseRtwScoringConfig } from '@/games/rtw-scoring/config';
import { DEFAULT_FILTER, type StatsFilter } from '@/stats/filter';
import { computeRtwStats, computeRtwScoringStats } from '@/stats/rtwStats';
import type { RtwScoringSessionStats, RtwSessionStats } from '@/stats/types';

export type RtwAggStats = {
  sessionCount: number;
  avgTargetsHit: number;
  avgHitRatePct: number | null;
  avgDartsThrown: number;
};

export type RtwScoringAggStats = {
  sessionCount: number;
  avgTargetsHit: number;
  avgDartsThrown: number;
  avgScore: number;
  bestScore: number;
};

export type RtwGroupKey = { gameType: RtwGameType; mode: RtwMode };
export type RtwScoringGroupKey = { order: RtwScoringOrder };

export type RtwGroupedStats = {
  key: RtwGroupKey;
  agg: RtwAggStats;
};

export type RtwScoringGroupedStats = {
  key: RtwScoringGroupKey;
  agg: RtwScoringAggStats;
};

export type UseRtwStatsResult = {
  loading: boolean;
  rtwGroups: RtwGroupedStats[];
  rtwScoringGroups: RtwScoringGroupedStats[];
};

function aggregateRtw(all: RtwSessionStats[]): RtwAggStats {
  const avgTargetsHit = all.reduce((s, x) => s + x.targetsHit, 0) / all.length;
  const avgDartsThrown = all.reduce((s, x) => s + x.dartsThrown, 0) / all.length;
  const withRate = all.filter((x) => x.hitRatePct !== null);
  const avgHitRatePct =
    withRate.length > 0 ? withRate.reduce((s, x) => s + x.hitRatePct!, 0) / withRate.length : null;
  return { sessionCount: all.length, avgTargetsHit, avgHitRatePct, avgDartsThrown };
}

function aggregateRtwScoring(all: RtwScoringSessionStats[]): RtwScoringAggStats {
  const avgTargetsHit = all.reduce((s, x) => s + x.targetsHit, 0) / all.length;
  const avgDartsThrown = all.reduce((s, x) => s + x.dartsThrown, 0) / all.length;
  const avgScore = all.reduce((s, x) => s + x.totalScore, 0) / all.length;
  const bestScore = Math.max(...all.map((x) => x.totalScore));
  return { sessionCount: all.length, avgTargetsHit, avgDartsThrown, avgScore, bestScore };
}

export function useRtwStats(
  profileId: string | null,
  filter: StatsFilter = DEFAULT_FILTER
): UseRtwStatsResult {
  const { loading: rtwLoading, pairs: rtwPairs } = useFilteredSessionStats<RtwSessionStats>(
    'rtw',
    profileId,
    filter,
    (events, session) => {
      let config;
      try {
        config = parseRtwConfig(session.gameConfig);
      } catch {
        return null;
      }
      return computeRtwStats(events, config, session);
    }
  );

  const { loading: scoringLoading, pairs: scoringPairs } =
    useFilteredSessionStats<RtwScoringSessionStats>(
      'rtw-scoring',
      profileId,
      filter,
      (events, session) => {
        let config;
        try {
          config = parseRtwScoringConfig(session.gameConfig);
        } catch {
          return null;
        }
        return computeRtwScoringStats(events, config, session);
      }
    );

  const rtwGroups = useMemo<RtwGroupedStats[]>(() => {
    const buckets = new Map<string, { key: RtwGroupKey; stats: RtwSessionStats[] }>();
    for (const { session, stats } of rtwPairs) {
      let config;
      try {
        config = parseRtwConfig(session.gameConfig);
      } catch {
        continue;
      }
      const k = `${config.gameType}|${config.mode}`;
      if (!buckets.has(k)) {
        buckets.set(k, { key: { gameType: config.gameType, mode: config.mode }, stats: [] });
      }
      buckets.get(k)!.stats.push(stats);
    }
    return Array.from(buckets.values()).map(({ key, stats }) => ({
      key,
      agg: aggregateRtw(stats)
    }));
  }, [rtwPairs]);

  const rtwScoringGroups = useMemo<RtwScoringGroupedStats[]>(() => {
    const buckets = new Map<string, { key: RtwScoringGroupKey; stats: RtwScoringSessionStats[] }>();
    for (const { session, stats } of scoringPairs as SessionStatPair<RtwScoringSessionStats>[]) {
      let config;
      try {
        config = parseRtwScoringConfig(session.gameConfig);
      } catch {
        continue;
      }
      if (!buckets.has(config.order)) {
        buckets.set(config.order, { key: { order: config.order }, stats: [] });
      }
      buckets.get(config.order)!.stats.push(stats);
    }
    return Array.from(buckets.values()).map(({ key, stats }) => ({
      key,
      agg: aggregateRtwScoring(stats)
    }));
  }, [scoringPairs]);

  return { loading: rtwLoading || scoringLoading, rtwGroups, rtwScoringGroups };
}
