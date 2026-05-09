import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@/domain/types';
import { useProfile, useSessions } from '@/hooks';

const GAME_MODE_LABELS: Record<string, string> = {
  x01: 'X01',
  x01vc: 'X01 vs Computer',
  cricket: 'Cricket',
  rtw: 'Round the World',
  'rtw-scoring': 'RTW Scoring',
  checkout: 'Checkout Practice'
};

function gameModeLabel(id: string): string {
  return GAME_MODE_LABELS[id] ?? id;
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { sessions, discard } = useSessions({ status: 'in_progress' });
  const [error, setError] = useState<string | null>(null);

  const inProgress = useMemo(() => {
    if (!profile) return [];
    return sessions.filter((s) => s.participants.includes(profile.id));
  }, [sessions, profile]);

  const discardSession = async (session: Session) => {
    const confirmed = window.confirm(
      'Permanently discard this in-progress session? This cannot be undone.'
    );
    if (!confirmed) return;
    setError(null);
    try {
      await discard(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Home</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Local-first darts training. Your data stays on this device.
      </p>

      <section className="mt-6" aria-labelledby="in-progress-heading">
        <h2
          id="in-progress-heading"
          className="text-sm font-semibold text-slate-700 dark:text-slate-300"
        >
          In-progress sessions
        </h2>

        {inProgress.length === 0 ? (
          <p
            className="mt-2 text-sm text-slate-500 dark:text-slate-400"
            data-testid="in-progress-empty"
          >
            No sessions in progress.
          </p>
        ) : (
          <ul className="mt-2 space-y-2" data-testid="in-progress-list">
            {inProgress.map((session) => (
              <li
                key={session.id}
                className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950"
                data-testid={`in-progress-row-${session.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      {gameModeLabel(session.gameModeId)}
                    </div>
                    <div className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                      Started {new Date(session.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/game/${session.id}`)}
                      className="inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
                      data-testid={`in-progress-resume-${session.id}`}
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => void discardSession(session)}
                      className="inline-flex items-center rounded-md border border-amber-400 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
                      data-testid={`in-progress-discard-${session.id}`}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
