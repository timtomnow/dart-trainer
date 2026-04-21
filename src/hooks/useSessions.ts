import { useCallback, useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { CreateSessionInput, Session, SessionStatus } from '@/domain/types';
import type { ListSessionsFilter } from '@/storage/adapter';

export type { ListSessionsFilter };

export type UseSessionsResult = {
  sessions: Session[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: CreateSessionInput) => Promise<Session>;
  updateStatus: (id: string, status: SessionStatus) => Promise<Session>;
  discard: (id: string) => Promise<void>;
};

export function useSessions(filter: ListSessionsFilter = {}): UseSessionsResult {
  const adapter = useStorage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const filterKey = [
    Array.isArray(filter.status) ? filter.status.join(',') : (filter.status ?? ''),
    filter.gameModeId ?? '',
    filter.since ?? '',
    filter.until ?? '',
    filter.participantId ?? ''
  ].join('|');

  const refresh = useCallback(async () => {
    const next = await adapter.listSessions(filter);
    setSessions(next);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, filterKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    (input: CreateSessionInput) => adapter.createSession(input),
    [adapter]
  );

  const updateStatus = useCallback(
    (id: string, status: SessionStatus) => adapter.updateSessionStatus(id, status),
    [adapter]
  );

  const discard = useCallback(
    async (id: string) => {
      await adapter.discardSession(id);
      await refresh();
    },
    [adapter, refresh]
  );

  return { sessions, loading, refresh, create, updateStatus, discard };
}
