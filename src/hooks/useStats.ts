import { useMemo } from 'react';
import { useFilteredSessionStats } from './useFilteredSessionStats';
import { parseX01Config } from '@/games/x01/config';
import { computeSessionStats } from '@/stats/compute';
import { DEFAULT_FILTER, type StatsFilter } from '@/stats/filter';
import type { X01SessionStats } from '@/stats/types';

export type TrendPoint = {
  sessionId: string;
  startedAt: string;
  threeDartAvg: number;
};

export type AggregateStats = {
  sessionCount: number;
  threeDartAvg: number;
  firstNineAvg: number | null;
  checkoutPct: number | null;
  total180s: number;
  highestCheckout: number;
  shortestLeg: number | null;
};

export type UseStatsResult = {
  loading: boolean;
  aggregate: AggregateStats | null;
  trend: TrendPoint[];
};

export function aggregateSessionStats(all: X01SessionStats[]): AggregateStats | null {
  if (all.length === 0) return null;

  const threeDartAvg = all.reduce((s, x) => s + x.threeDartAvg, 0) / all.length;

  const withFirstNine = all.filter((x) => x.firstNineAvg !== null);
  const firstNineAvg =
    withFirstNine.length > 0
      ? withFirstNine.reduce((s, x) => s + x.firstNineAvg!, 0) / withFirstNine.length
      : null;

  const withCheckout = all.filter((x) => x.checkoutPct !== null);
  const checkoutPct =
    withCheckout.length > 0
      ? withCheckout.reduce((s, x) => s + x.checkoutPct!, 0) / withCheckout.length
      : null;

  const total180s = all.reduce((s, x) => s + x.count180, 0);
  const highestCheckout = all.reduce((m, x) => Math.max(m, x.highestCheckout), 0);

  const legsWon = all.filter((x) => x.shortestLeg !== null);
  const rawShortest =
    legsWon.length > 0 ? legsWon.reduce((m, x) => Math.min(m, x.shortestLeg!), Infinity) : null;
  const shortestLeg = rawShortest === Infinity ? null : rawShortest;

  return {
    sessionCount: all.length,
    threeDartAvg,
    firstNineAvg,
    checkoutPct,
    total180s,
    highestCheckout,
    shortestLeg
  };
}

export function useStats(
  profileId: string | null,
  filter: StatsFilter = DEFAULT_FILTER,
  gameModeId: 'x01' | 'x01vc' = 'x01'
): UseStatsResult {
  const { loading, pairs } = useFilteredSessionStats<X01SessionStats>(
    gameModeId,
    profileId,
    filter,
    (events, session) => {
      let config;
      try {
        config = parseX01Config(session.gameConfig);
      } catch {
        return null;
      }
      return computeSessionStats(events, config, session);
    }
  );

  const aggregate = useMemo(
    () => aggregateSessionStats(pairs.map((p) => p.stats)),
    [pairs]
  );

  // oldest → newest for left-to-right charting
  const trend = useMemo<TrendPoint[]>(
    () =>
      [...pairs].reverse().map(({ session, stats }) => ({
        sessionId: session.id,
        startedAt: session.startedAt,
        threeDartAvg: stats.threeDartAvg
      })),
    [pairs]
  );

  return { loading, aggregate, trend };
}
