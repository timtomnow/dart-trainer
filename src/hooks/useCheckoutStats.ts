import { useCallback, useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { Session } from '@/domain/types';
import { parseCheckoutConfig } from '@/games/checkout/config';
import { computeCheckoutStats } from '@/stats/checkoutStats';
import type { CheckoutSessionStats } from '@/stats/types';

const LIMIT = 20;
const TERMINAL: Array<Session['status']> = ['completed', 'forfeited'];

export type CheckoutAggStats = {
  sessionCount: number;
  avgSuccessRate: number | null;
  bestHardestFinish: number | null;
  avgAttemptsPerSession: number;
};

export type UseCheckoutStatsResult = {
  loading: boolean;
  sessions: CheckoutSessionStats[];
  agg: CheckoutAggStats | null;
};

export function useCheckoutStats(profileId: string | null): UseCheckoutStatsResult {
  const adapter = useStorage();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<CheckoutSessionStats[]>([]);
  const [agg, setAgg] = useState<CheckoutAggStats | null>(null);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      setSessions([]);
      setAgg(null);
      return;
    }

    setLoading(true);
    const checkoutSessions = await adapter.listSessions({
      gameModeId: 'checkout',
      status: TERMINAL,
      participantId: profileId
    });

    const allStats: CheckoutSessionStats[] = [];
    for (const session of checkoutSessions.slice(0, LIMIT)) {
      let config;
      try {
        config = parseCheckoutConfig(session.gameConfig);
      } catch {
        continue;
      }
      const events = await adapter.listEvents(session.id);
      if (events.length === 0) continue;
      allStats.push(computeCheckoutStats(events, config, session));
    }

    setSessions(allStats);

    if (allStats.length > 0) {
      const withRate = allStats.filter((s) => s.successRate !== null);
      const avgSuccessRate =
        withRate.length > 0
          ? withRate.reduce((s, x) => s + x.successRate!, 0) / withRate.length
          : null;
      const hardestValues = allStats
        .map((s) => s.hardestFinishHit)
        .filter((v): v is number => v !== null);
      const bestHardestFinish = hardestValues.length > 0 ? Math.max(...hardestValues) : null;
      const avgAttemptsPerSession =
        allStats.reduce((s, x) => s + x.totalAttempts, 0) / allStats.length;
      setAgg({ sessionCount: allStats.length, avgSuccessRate, bestHardestFinish, avgAttemptsPerSession });
    } else {
      setAgg(null);
    }

    setLoading(false);
  }, [adapter, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, sessions, agg };
}
