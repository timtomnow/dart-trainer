import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { CreateProfileInput, PlayerProfile } from '@/domain/types';

export type UseProfilesOptions = {
  includeArchived?: boolean;
};

export type UseProfilesResult = {
  profiles: PlayerProfile[];
  loading: boolean;
  create: (input: CreateProfileInput) => Promise<PlayerProfile>;
  rename: (id: string, name: string) => Promise<PlayerProfile>;
  archive: (id: string) => Promise<PlayerProfile>;
  restore: (id: string) => Promise<PlayerProfile>;
};

export function useProfiles(options: UseProfilesOptions = {}): UseProfilesResult {
  const adapter = useStorage();
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const includeArchived = options.includeArchived ?? false;

  const subscribeOptions = useMemo(() => ({ includeArchived }), [includeArchived]);

  useEffect(() => {
    let first = true;
    const unsub = adapter.subscribeProfiles((next) => {
      setProfiles(next);
      if (first) {
        first = false;
        setLoading(false);
      }
    }, subscribeOptions);
    return unsub;
  }, [adapter, subscribeOptions]);

  const create = useCallback(
    (input: CreateProfileInput) => adapter.createProfile(input),
    [adapter]
  );
  const rename = useCallback(
    (id: string, name: string) => adapter.renameProfile(id, name),
    [adapter]
  );
  const archive = useCallback((id: string) => adapter.archiveProfile(id), [adapter]);
  const restore = useCallback((id: string) => adapter.restoreProfile(id), [adapter]);

  return { profiles, loading, create, rename, archive, restore };
}
