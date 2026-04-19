import { useCallback, useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { Session } from '@/domain/types';
import { parseX01Config } from '@/games/x01/config';
import { isCacheStale, sessionCacheKey, statsFromRecord, statsToRecord } from '@/stats/cache';
import { computeSessionStats } from '@/stats/compute';
import type { X01SessionStats } from '@/stats/types';

const TREND_LIMIT = 20;
const X01_TERMINAL: Array<Session['status']> = ['completed', 'forfeited'];

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

function aggregateSessionStats(all: X01SessionStats[]): AggregateStats | null {
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

  return { sessionCount: all.length, threeDartAvg, firstNineAvg, checkoutPct, total180s, highestCheckout, shortestLeg };
}

export function useStats(profileId: string | null): UseStatsResult {
  const adapter = useStorage();
  const [loading, setLoading] = useState(true);
  const [aggregate, setAggregate] = useState<AggregateStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      setAggregate(null);
      setTrend([]);
      return;
    }

    setLoading(true);

    // newest-first from the adapter
    const sessions = await adapter.listSessions({
      gameModeId: 'x01',
      status: X01_TERMINAL,
      participantId: profileId
    });

    const recent = sessions.slice(0, TREND_LIMIT);

    type Pair = { session: Session; stats: X01SessionStats };
    const pairs: Pair[] = [];

    for (const session of recent) {
      let config;
      try {
        config = parseX01Config(session.gameConfig);
      } catch {
        continue;
      }

      const events = await adapter.listEvents(session.id);
      if (events.length === 0) continue;

      const seqMax = events[events.length - 1]!.seq;
      const cacheKey = sessionCacheKey(session.id);
      const cached = await adapter.getDerivedStats('session', cacheKey);

      let stats: X01SessionStats;
      if (!isCacheStale(cached, seqMax) && cached) {
        const fromCache = statsFromRecord(cached);
        if (fromCache) {
          pairs.push({ session, stats: fromCache });
          continue;
        }
      }

      stats = computeSessionStats(events, config, session);
      pairs.push({ session, stats });
      void adapter.putDerivedStats(statsToRecord(session.id, seqMax, stats));
    }

    // trend: oldest → newest (left to right on chart)
    const trendPoints: TrendPoint[] = [...pairs].reverse().map(({ session, stats }) => ({
      sessionId: session.id,
      startedAt: session.startedAt,
      threeDartAvg: stats.threeDartAvg
    }));

    setAggregate(aggregateSessionStats(pairs.map((p) => p.stats)));
    setTrend(trendPoints);
    setLoading(false);
  }, [adapter, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, aggregate, trend };
}
