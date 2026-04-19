import { useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { GameEvent } from '@/domain/types';

export type UseSessionEventsResult = {
  events: GameEvent[];
  loading: boolean;
};

export function useSessionEvents(sessionId: string): UseSessionEventsResult {
  const adapter = useStorage();
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void adapter.listEvents(sessionId).then((evs) => {
      if (!cancelled) {
        setEvents(evs);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [adapter, sessionId]);

  return { events, loading };
}
