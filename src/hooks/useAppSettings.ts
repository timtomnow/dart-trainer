import { useCallback, useEffect, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import type { AppSettings, AppSettingsPatch } from '@/domain/types';

export type UseAppSettingsResult = {
  settings: AppSettings | null;
  loading: boolean;
  updateSettings: (patch: AppSettingsPatch) => Promise<void>;
  setActiveProfile: (id: string | null) => Promise<void>;
};

export function useAppSettings(): UseAppSettingsResult {
  const adapter = useStorage();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let first = true;
    const unsub = adapter.subscribeAppSettings((next) => {
      setSettings(next);
      if (first) {
        first = false;
        setLoading(false);
      }
    });
    return unsub;
  }, [adapter]);

  const updateSettings = useCallback(
    async (patch: AppSettingsPatch) => {
      await adapter.updateAppSettings(patch);
    },
    [adapter]
  );

  const setActiveProfile = useCallback(
    (id: string | null) => adapter.setActiveProfile(id),
    [adapter]
  );

  return { settings, loading, updateSettings, setActiveProfile };
}
