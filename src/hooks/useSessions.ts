import { useCallback, useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { CreateSessionInput, Session, SessionStatus } from '@/domain/types';
import type { ListSessionsFilter } from '@/storage/adapter';

export type UseSessionsResult = {
  sessions: Session[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: CreateSessionInput) => Promise<Session>;
  updateStatus: (id: string, status: SessionStatus) => Promise<Session>;
};

export function useSessions(filter: ListSessionsFilter = {}): UseSessionsResult {
  const adapter = useStorage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const statusKey = Array.isArray(filter.status)
    ? filter.status.join(',')
    : (filter.status ?? '');

  const refresh = useCallback(async () => {
    const next = await adapter.listSessions(filter);
    setSessions(next);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, statusKey]);

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

  return { sessions, loading, refresh, create, updateStatus };
}
