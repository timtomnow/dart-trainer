import { type ReactNode } from 'react';
import { useProfiles } from '@/hooks';
import { NeedsFirstProfile } from '@/screens/welcome/NeedsFirstProfile';

export function BootGate({ children }: { children: ReactNode }) {
  const { profiles, loading } = useProfiles();

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="flex min-h-[100dvh] items-center justify-center text-sm text-slate-500 dark:text-slate-400"
      >
        Loading…
      </div>
    );
  }

  if (profiles.length === 0) {
    return <NeedsFirstProfile />;
  }

  return <>{children}</>;
}
