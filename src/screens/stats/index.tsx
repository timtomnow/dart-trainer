import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { STATS_GAMES } from './detail/registry';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useSessions } from '@/hooks/useSessions';

const TERMINAL = ['completed', 'forfeited'] as const;

function GameCard({ label, id, count }: { label: string; id: string; count: number }) {
  return (
    <Link
      to={`/stats/${id}`}
      data-testid={`stats-game-card-${id}`}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:bg-slate-700"
    >
      <span className="font-medium">{label}</span>
      <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
        {count > 0 ? `${count} session${count !== 1 ? 's' : ''}` : 'No sessions'}
      </span>
    </Link>
  );
}

export function StatsScreen() {
  const { settings } = useAppSettings();
  const profileId = settings?.activeProfileId ?? null;
  const { sessions, loading } = useSessions(
    profileId ? { status: [...TERMINAL], participantId: profileId } : {}
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    if (profileId) {
      for (const s of sessions) map.set(s.gameModeId, (map.get(s.gameModeId) ?? 0) + 1);
    }
    return map;
  }, [sessions, profileId]);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Stats</h1>

      {!profileId && (
        <p className="text-slate-500 dark:text-slate-400">
          Create a profile to start tracking stats.
        </p>
      )}

      {profileId && (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Pick a game to see its stats.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {STATS_GAMES.map((g) => (
              <GameCard key={g.id} id={g.id} label={g.label} count={loading ? 0 : counts.get(g.id) ?? 0} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
