import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameEvent, Session, ThrowSegment } from '@/domain/types';
import type { FreeformAction, FreeformViewModel } from '@/games/freeform';
import { useUiPrefs } from '@/hooks';
import { dartFeedback } from '@/lib/feedback';
import { InGameSettings } from '@/screens/game/InGameSettings';

const QUICK_THROWS: Array<{ label: string; segment: ThrowSegment; value: number }> = [
  { label: 'Miss', segment: 'MISS', value: 0 },
  { label: 'S20', segment: 'S', value: 20 },
  { label: 'T20', segment: 'T', value: 60 },
  { label: 'S19', segment: 'S', value: 19 },
  { label: 'T19', segment: 'T', value: 57 },
  { label: 'Bull', segment: 'SB', value: 25 },
  { label: 'D-Bull', segment: 'DB', value: 50 }
];

type Props = {
  session: Session;
  events: GameEvent[];
  view: FreeformViewModel;
  dispatch: (action: FreeformAction) => Promise<void>;
  undo: () => Promise<void>;
  forfeit: (participantId: string) => Promise<void>;
};

export function FreeformView({ session, events, view, dispatch, undo, forfeit }: Props) {
  const navigate = useNavigate();
  const uiPrefs = useUiPrefs();
  const [actionError, setActionError] = useState<string | null>(null);

  const participantId = session.participants[0]!;
  const dartIndex = (view.throwCount % 3) as 0 | 1 | 2;

  const run = async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const runThrow = (segment: ThrowSegment, value: number) => {
    dartFeedback(uiPrefs);
    return run(() => dispatch({ type: 'throw', participantId, segment, value, dartIndex }));
  };

  return (
    <section className="mx-auto max-w-3xl">
      <header className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold">Active Game</h1>
          <InGameSettings />
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">{session.gameModeId}</span>
      </header>

      <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Status</dt>
          <dd className="font-medium" data-testid="session-status">
            {view.status}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Throws</dt>
          <dd className="font-medium" data-testid="throw-count">
            {view.throwCount}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Last</dt>
          <dd className="font-medium" data-testid="last-throw">
            {view.lastThrow ? `${view.lastThrow.segment} · ${view.lastThrow.value}` : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2" aria-label="Quick throw buttons">
        {QUICK_THROWS.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => runThrow(t.segment, t.value)}
            disabled={view.status === 'forfeited'}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => run(() => undo())}
          disabled={!view.canUndo}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => run(() => forfeit(participantId))}
          disabled={view.status === 'forfeited'}
          className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          Forfeit
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Quit
        </button>
      </div>

      {actionError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {actionError}
        </p>
      )}

      <details className="mt-8 text-sm">
        <summary className="cursor-pointer text-slate-500 dark:text-slate-400">
          Event log ({events.length})
        </summary>
        <ol className="mt-2 space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400">
          {events.map((e) => (
            <li key={e.id} data-testid="event-row">
              #{e.seq} {e.type} {JSON.stringify(e.payload)}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
