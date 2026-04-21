import { useCallback, useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { Session } from '@/domain/types';
import { parseRtwConfig } from '@/games/rtw/config';
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

export type RtwScoringAggStats = RtwAggStats & {
  avgScore: number;
  bestScore: number;
};

export type UseRtwStatsResult = {
  loading: boolean;
  rtwAggregate: RtwAggStats | null;
  rtwScoringAggregate: RtwScoringAggStats | null;
};

function aggregateRtw(all: RtwSessionStats[]): RtwAggStats | null {
  if (all.length === 0) return null;
  const avgTargetsHit = all.reduce((s, x) => s + x.targetsHit, 0) / all.length;
  const avgDartsThrown = all.reduce((s, x) => s + x.dartsThrown, 0) / all.length;
  const withRate = all.filter((x) => x.hitRatePct !== null);
  const avgHitRatePct =
    withRate.length > 0
      ? withRate.reduce((s, x) => s + x.hitRatePct!, 0) / withRate.length
      : null;
  return { sessionCount: all.length, avgTargetsHit, avgHitRatePct, avgDartsThrown };
}

function aggregateRtwScoring(all: RtwScoringSessionStats[]): RtwScoringAggStats | null {
  if (all.length === 0) return null;
  const base = aggregateRtw(all)!;
  const avgScore = all.reduce((s, x) => s + x.totalScore, 0) / all.length;
  const bestScore = Math.max(...all.map((x) => x.totalScore));
  return { ...base, avgScore, bestScore };
}

export function useRtwStats(profileId: string | null): UseRtwStatsResult {
  const adapter = useStorage();
  const [loading, setLoading] = useState(true);
  const [rtwAgg, setRtwAgg] = useState<RtwAggStats | null>(null);
  const [rtwScoringAgg, setRtwScoringAgg] = useState<RtwScoringAggStats | null>(null);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      setRtwAgg(null);
      setRtwScoringAgg(null);
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

    const rtwStatsList: RtwSessionStats[] = [];
    for (const session of rtwSessions.slice(0, LIMIT)) {
      let config;
      try { config = parseRtwConfig(session.gameConfig); } catch { continue; }
      const events = await adapter.listEvents(session.id);
      if (events.length === 0) continue;
      rtwStatsList.push(computeRtwStats(events, config, session));
    }

    const rtwScoringStatsList: RtwScoringSessionStats[] = [];
    for (const session of rtwScoringSessions.slice(0, LIMIT)) {
      let config;
      try { config = parseRtwScoringConfig(session.gameConfig); } catch { continue; }
      const events = await adapter.listEvents(session.id);
      if (events.length === 0) continue;
      rtwScoringStatsList.push(computeRtwScoringStats(events, config, session));
    }

    setRtwAgg(aggregateRtw(rtwStatsList));
    setRtwScoringAgg(aggregateRtwScoring(rtwScoringStatsList));
    setLoading(false);
  }, [adapter, profileId]);

  useEffect(() => { void load(); }, [load]);

  return { loading, rtwAggregate: rtwAgg, rtwScoringAggregate: rtwScoringAgg };
}
