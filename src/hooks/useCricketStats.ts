import { useCallback, useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { Session } from '@/domain/types';
import { parseCricketConfig } from '@/games/cricket/config';
import { computeCricketStats } from '@/stats/cricketStats';
import type { CricketSessionStats } from '@/stats/types';

const LIMIT = 20;
const TERMINAL: Array<Session['status']> = ['completed', 'forfeited'];

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

export function useCricketStats(profileId: string | null): UseCricketStatsResult {
  const adapter = useStorage();
  const [loading, setLoading] = useState(true);
  const [agg, setAgg] = useState<CricketAggStats | null>(null);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      setAgg(null);
      return;
    }

    setLoading(true);

    const sessions = await adapter.listSessions({
      gameModeId: 'cricket',
      status: TERMINAL,
      participantId: profileId
    });

    const recent = sessions.slice(0, LIMIT);
    const statsList: CricketSessionStats[] = [];

    for (const session of recent) {
      let config;
      try {
        config = parseCricketConfig(session.gameConfig);
      } catch {
        continue;
      }
      const events = await adapter.listEvents(session.id);
      if (events.length === 0) continue;
      statsList.push(computeCricketStats(events, config, session));
    }

    setAgg(aggregate(statsList));
    setLoading(false);
  }, [adapter, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, aggregate: agg };
}
