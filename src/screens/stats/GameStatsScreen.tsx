import { Link, useParams } from 'react-router-dom';
import { getStatsGame } from './detail/registry';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useStatsFilter } from '@/hooks/useStatsFilter';
import { StatsFilterBar } from '@/ui/stats/StatsFilterBar';

export function GameStatsScreen() {
  const { gameModeId } = useParams();
  const { settings } = useAppSettings();
  const profileId = settings?.activeProfileId ?? null;
  const { filter, setFilter } = useStatsFilter();

  const game = getStatsGame(gameModeId);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/stats" className="text-blue-600 hover:underline dark:text-blue-400">
          Stats
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 dark:text-slate-400">{game?.label ?? gameModeId}</span>
      </div>

      <h1 className="text-2xl font-semibold">{game?.label ?? 'Unknown game'}</h1>

      {!game && (
        <p className="text-slate-500 dark:text-slate-400">No stats available for this game.</p>
      )}

      {game && !profileId && (
        <p className="text-slate-500 dark:text-slate-400">
          Create a profile to start tracking stats.
        </p>
      )}

      {game && profileId && (
        <>
          <StatsFilterBar value={filter} onChange={setFilter} />
          <game.Panel profileId={profileId} filter={filter} />
        </>
      )}
    </section>
  );
}
