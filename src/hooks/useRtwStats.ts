import { useCallback, useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { Session } from '@/domain/types';
import type { RtwGameType, RtwMode } from '@/games/rtw/config';
import { parseRtwConfig } from '@/games/rtw/config';
import type { RtwScoringOrder } from '@/games/rtw-scoring/config';
import { parseRtwScoringConfig } from '@/games/rtw-scoring/config';
import { computeRtwStats, computeRtwScoringStats } from '@/stats/rtwStats';
import type { RtwScoringSessionStats, RtwSessionStats } from '@/stats/types';

const LIMIT = 20;
const TERMINAL: Array<Session['status']> = ['completed', 'forfeited'];

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

function groupKey(gameType: RtwGameType, mode: RtwMode): string {
  return `${gameType}|${mode}`;
}

function aggregateRtw(all: RtwSessionStats[]): RtwAggStats {
  const avgTargetsHit = all.reduce((s, x) => s + x.targetsHit, 0) / all.length;
  const avgDartsThrown = all.reduce((s, x) => s + x.dartsThrown, 0) / all.length;
  const withRate = all.filter((x) => x.hitRatePct !== null);
  const avgHitRatePct =
    withRate.length > 0
      ? withRate.reduce((s, x) => s + x.hitRatePct!, 0) / withRate.length
      : null;
  return { sessionCount: all.length, avgTargetsHit, avgHitRatePct, avgDartsThrown };
}

function aggregateRtwScoring(all: RtwScoringSessionStats[]): RtwScoringAggStats {
  const avgTargetsHit = all.reduce((s, x) => s + x.targetsHit, 0) / all.length;
  const avgDartsThrown = all.reduce((s, x) => s + x.dartsThrown, 0) / all.length;
  const avgScore = all.reduce((s, x) => s + x.totalScore, 0) / all.length;
  const bestScore = Math.max(...all.map((x) => x.totalScore));
  return { sessionCount: all.length, avgTargetsHit, avgDartsThrown, avgScore, bestScore };
}

export function useRtwStats(profileId: string | null): UseRtwStatsResult {
  const adapter = useStorage();
  const [loading, setLoading] = useState(true);
  const [rtwGroups, setRtwGroups] = useState<RtwGroupedStats[]>([]);
  const [rtwScoringGroups, setRtwScoringGroups] = useState<RtwScoringGroupedStats[]>([]);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      setRtwGroups([]);
      setRtwScoringGroups([]);
      return;
    }

    setLoading(true);

    const [rtwSessions, rtwScoringSessions] = await Promise.all([
      adapter.listSessions({ gameModeId: 'rtw', status: TERMINAL, participantId: profileId }),
      adapter.listSessions({
        gameModeId: 'rtw-scoring',
        status: TERMINAL,
        participantId: profileId
      })
    ]);

    const rtwBuckets = new Map<string, { key: RtwGroupKey; stats: RtwSessionStats[] }>();
    for (const session of rtwSessions.slice(0, LIMIT)) {
      let config;
      try { config = parseRtwConfig(session.gameConfig); } catch { continue; }
      const events = await adapter.listEvents(session.id);
      if (events.length === 0) continue;
      const k = groupKey(config.gameType, config.mode);
      if (!rtwBuckets.has(k)) {
        rtwBuckets.set(k, { key: { gameType: config.gameType, mode: config.mode }, stats: [] });
      }
      rtwBuckets.get(k)!.stats.push(computeRtwStats(events, config, session));
    }
    setRtwGroups(
      Array.from(rtwBuckets.values()).map(({ key, stats }) => ({ key, agg: aggregateRtw(stats) }))
    );

    const scoringBuckets = new Map<string, { key: RtwScoringGroupKey; stats: RtwScoringSessionStats[] }>();
    for (const session of rtwScoringSessions.slice(0, LIMIT)) {
      let config;
      try { config = parseRtwScoringConfig(session.gameConfig); } catch { continue; }
      const events = await adapter.listEvents(session.id);
      if (events.length === 0) continue;
      const k = config.order;
      if (!scoringBuckets.has(k)) {
        scoringBuckets.set(k, { key: { order: config.order }, stats: [] });
      }
      scoringBuckets.get(k)!.stats.push(computeRtwScoringStats(events, config, session));
    }
    setRtwScoringGroups(
      Array.from(scoringBuckets.values()).map(({ key, stats }) => ({
        key,
        agg: aggregateRtwScoring(stats)
      }))
    );

    setLoading(false);
  }, [adapter, profileId]);

  useEffect(() => { void load(); }, [load]);

  return { loading, rtwGroups, rtwScoringGroups };
}
