import { useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { GameEvent, Session } from '@/domain/types';

export type UseSessionDetailResult = {
  session: Session | null;
  events: GameEvent[];
  loading: boolean;
  error: Error | null;
};

export function useSessionDetail(sessionId: string): UseSessionDetailResult {
  const adapter = useStorage();
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([adapter.getSession(sessionId), adapter.listEvents(sessionId)])
      .then(([s, evs]) => {
        if (!cancelled) {
          setSession(s);
          setEvents(evs);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adapter, sessionId]);

  return { session, events, loading, error };
}
