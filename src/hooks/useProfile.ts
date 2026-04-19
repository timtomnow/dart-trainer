import { useCallback, useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { PlayerProfile } from '@/domain/types';

export type UseProfileResult = {
  profile: PlayerProfile | null;
  loading: boolean;
  setActive: (id: string | null) => Promise<void>;
};

export function useProfile(): UseProfileResult {
  const adapter = useStorage();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let first = true;
    const unsub = adapter.subscribeActiveProfile((next) => {
      setProfile(next);
      if (first) {
        first = false;
        setLoading(false);
      }
    });
    return unsub;
  }, [adapter]);

  const setActive = useCallback((id: string | null) => adapter.setActiveProfile(id), [adapter]);

  return { profile, loading, setActive };
}
