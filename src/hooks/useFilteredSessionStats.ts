import { useCallback, useEffect, useRef, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { GameEvent, Session } from '@/domain/types';
import {
  genericStatsFromRecord,
  genericStatsToRecord,
  isCacheStale,
  sessionCacheKey
} from '@/stats/cache';
import { resolveFilter, type StatsFilter } from '@/stats/filter';

const TERMINAL: Array<Session['status']> = ['completed', 'forfeited'];

export type SessionStatPair<T> = {
  session: Session;
  stats: T;
};

export type UseFilteredSessionStatsResult<T> = {
  loading: boolean;
  pairs: SessionStatPair<T>[];
};

/**
 * Shared selection + caching core for every game's stats page. Loads the
 * profile's terminal sessions for one game, applies the date window and
 * trailing-count limit from `filter`, and resolves each session's stats from
 * the derived cache (recomputing only when the event log has advanced).
 *
 * `computeOne` returns `null` to skip a session (e.g. unparseable config). It
 * is read through a ref so callers can pass an inline closure without
 * re-triggering the load.
 */
export function useFilteredSessionStats<T extends object>(
  gameModeId: string,
  profileId: string | null,
  filter: StatsFilter,
  computeOne: (events: GameEvent[], session: Session) => T | null,
  /** Reject cache entries whose shape predates the current computeOne. */
  isValidCached: (cached: T) => boolean = () => true
): UseFilteredSessionStatsResult<T> {
  const adapter = useStorage();
  const [loading, setLoading] = useState(true);
  const [pairs, setPairs] = useState<SessionStatPair<T>[]>([]);

  const computeRef = useRef(computeOne);
  computeRef.current = computeOne;
  const validRef = useRef(isValidCached);
  validRef.current = isValidCached;

  const filterKey = JSON.stringify(filter);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      setPairs([]);
      return;
    }

    setLoading(true);

    const { since, until, limit } = resolveFilter(filter);
    const sessions = await adapter.listSessions({
      gameModeId,
      status: TERMINAL,
      participantId: profileId,
      since,
      until
    });

    const selected = limit ? sessions.slice(0, limit) : sessions;
    const result: SessionStatPair<T>[] = [];

    for (const session of selected) {
      const events = await adapter.listEvents(session.id);
      if (events.length === 0) continue;

      const seqMax = events[events.length - 1]!.seq;
      const cached = await adapter.getDerivedStats('session', sessionCacheKey(session.id));

      if (!isCacheStale(cached, seqMax) && cached) {
        const fromCache = genericStatsFromRecord<T>(cached);
        if (fromCache && validRef.current(fromCache)) {
          result.push({ session, stats: fromCache });
          continue;
        }
      }

      const stats = computeRef.current(events, session);
      if (!stats) continue;
      result.push({ session, stats });
      void adapter.putDerivedStats(genericStatsToRecord(session.id, seqMax, stats));
    }

    setPairs(result);
    setLoading(false);
    // filterKey captures the filter; computeOne is read via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, gameModeId, profileId, filterKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, pairs };
}
