import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FREEFORM_GAME_ID } from '@/games/freeform';
import { useProfile, useSessions } from '@/hooks';

export function HomeScreen() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { sessions, create } = useSessions({ status: 'in_progress' });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumable = useMemo(() => {
    if (!profile) return null;
    return sessions.find((s) => s.participants.includes(profile.id)) ?? null;
  }, [sessions, profile]);

  const startFreeform = async () => {
    if (!profile) return;
    setStarting(true);
    setError(null);
    try {
      const session = await create({
        gameModeId: FREEFORM_GAME_ID,
        gameConfig: {},
        participants: [profile.id]
      });
      navigate(`/game/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStarting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Home</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Local-first darts training. Your data stays on this device.
      </p>

      {resumable && (
        <div
          className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"
          data-testid="resume-card"
        >
          <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Resume in-progress session
          </div>
          <div className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            {resumable.gameModeId} · started {new Date(resumable.startedAt).toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => navigate(`/game/${resumable.id}`)}
            className="mt-3 inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
          >
            Resume
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('/play')}
          disabled={!profile}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="home-play"
        >
          Play
        </button>
        <button
          type="button"
          onClick={startFreeform}
          disabled={!profile || starting}
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {starting ? 'Starting…' : 'Start freeform session'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
