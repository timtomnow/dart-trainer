import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { StorageAdapter } from '@/storage/adapter';
import { DexieStorageAdapter } from '@/storage/dexie';
import { requestPersistentStorageOnce } from '@/storage/persist';

type StorageContextValue = {
  adapter: StorageAdapter;
};

const StorageContext = createContext<StorageContextValue | null>(null);

type StorageProviderProps = {
  children: ReactNode;
  adapter?: StorageAdapter;
  fallback?: ReactNode;
};

export function StorageProvider({ children, adapter, fallback }: StorageProviderProps) {
  const instance = useMemo<StorageAdapter>(
    () => adapter ?? new DexieStorageAdapter({ appVersion: import.meta.env['VITE_APP_VERSION'] ?? '0.0.0' }),
    [adapter]
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await instance.init();
        void requestPersistentStorageOnce();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instance]);

  if (error) {
    return (
      <div role="alert" className="mx-auto max-w-lg p-6 text-sm text-red-600">
        Failed to open local storage: {error.message}
      </div>
    );
  }

  if (!ready) {
    return <>{fallback ?? null}</>;
  }

  return <StorageContext.Provider value={{ adapter: instance }}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageAdapter {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used inside StorageProvider');
  return ctx.adapter;
}
