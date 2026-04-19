import { useState } from 'react';
import { SessionRow } from './SessionRow';
import type { ListSessionsFilter } from '@/hooks';
import { useSessions } from '@/hooks';

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

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">History</h1>

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
          <p className="text-sm text-slate-500 dark:text-slate-400" data-testid="history-empty">
            No sessions match the current filters.
          </p>
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
