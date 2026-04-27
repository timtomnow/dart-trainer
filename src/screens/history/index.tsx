import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SessionRow } from './SessionRow';
import type { ListSessionsFilter } from '@/hooks';
import { useQuotaHint, useSessions } from '@/hooks';

type ModeFilter = 'all' | 'x01' | 'freeform';

const TERMINAL_STATUSES = ['completed', 'forfeited', 'abandoned'] as const;

function buildFilter(mode: ModeFilter, since: string, until: string): ListSessionsFilter {
  const filter: ListSessionsFilter = {
    status: [...TERMINAL_STATUSES]
  };
  if (mode !== 'all') filter.gameModeId = mode;
  if (since) filter.since = new Date(since).toISOString();
  if (until) {
    const d = new Date(until);
    d.setDate(d.getDate() + 1);
    filter.until = d.toISOString();
  }
  return filter;
}

export function HistoryScreen() {
  const [mode, setMode] = useState<ModeFilter>('all');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');

  const filter = buildFilter(mode, since, until);
  const { sessions, loading } = useSessions(filter);
  const quotaHint = useQuotaHint();
  const filtersActive = mode !== 'all' || Boolean(since) || Boolean(until);

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">History</h1>

      {quotaHint.active && (
        <div
          role="status"
          data-testid="quota-hint"
          className="mt-4 flex items-start justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950"
        >
          <p className="text-amber-900 dark:text-amber-200">
            Storage is getting full. Consider exporting a backup.
          </p>
          <button
            type="button"
            onClick={quotaHint.dismiss}
            className="rounded-md border border-amber-400 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ModeFilter)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
            data-testid="history-filter-mode"
          >
            <option value="all">All modes</option>
            <option value="x01">X01</option>
            <option value="freeform">Freeform</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            From
          </label>
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
            data-testid="history-filter-since"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            To
          </label>
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
            data-testid="history-filter-until"
          />
        </div>

        {(mode !== 'all' || since || until) && (
          <button
            type="button"
            onClick={() => { setMode('all'); setSince(''); setUntil(''); }}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            data-testid="history-filter-clear"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-4">
        {loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400" aria-busy="true">
            Loading…
          </p>
        )}

        {!loading && sessions.length === 0 && (
          <div data-testid="history-empty" className="rounded-md border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
            {filtersActive ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No sessions match the current filters.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No sessions yet. Play one.
                </p>
                <Link
                  to="/play"
                  className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Play a session
                </Link>
              </>
            )}
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <ul className="space-y-2" data-testid="history-list">
            {sessions.map((session) => (
              <li key={session.id}>
                <SessionRow session={session} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
