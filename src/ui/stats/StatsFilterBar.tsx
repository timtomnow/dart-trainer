import { LAST_N_COUNTS, type LastNCount, type StatsFilter } from '@/stats/filter';

type Mode = 'all' | 'past30' | 'pastYear' | 'range' | 'lastN';

const SEGMENTS: Array<{ mode: Mode; label: string }> = [
  { mode: 'all', label: 'All time' },
  { mode: 'past30', label: 'Past 30d' },
  { mode: 'pastYear', label: 'Past year' },
  { mode: 'range', label: 'Custom' },
  { mode: 'lastN', label: 'Last N' }
];

function modeOf(filter: StatsFilter): Mode {
  switch (filter.kind) {
    case 'all':
      return 'all';
    case 'preset':
      return filter.preset === 'past30' ? 'past30' : 'pastYear';
    case 'range':
      return 'range';
    case 'lastN':
      return 'lastN';
  }
}

function defaultForMode(mode: Mode, prev: StatsFilter): StatsFilter {
  switch (mode) {
    case 'all':
      return { kind: 'all' };
    case 'past30':
      return { kind: 'preset', preset: 'past30' };
    case 'pastYear':
      return { kind: 'preset', preset: 'pastYear' };
    case 'range':
      return prev.kind === 'range' ? prev : { kind: 'range' };
    case 'lastN':
      return prev.kind === 'lastN' ? prev : { kind: 'lastN', n: 10 };
  }
}

type Props = {
  value: StatsFilter;
  onChange: (next: StatsFilter) => void;
};

export function StatsFilterBar({ value, onChange }: Props) {
  const mode = modeOf(value);

  return (
    <div className="space-y-3" data-testid="stats-filter-bar">
      <div
        role="group"
        aria-label="Filter stats"
        className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
      >
        {SEGMENTS.map((seg) => {
          const active = seg.mode === mode;
          return (
            <button
              key={seg.mode}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(defaultForMode(seg.mode, value))}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                active
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              ].join(' ')}
            >
              {seg.label}
            </button>
          );
        })}
      </div>

      {value.kind === 'range' && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              From
            </span>
            <input
              type="date"
              value={value.since ?? ''}
              max={value.until ?? undefined}
              onChange={(e) =>
                onChange({ ...value, since: e.target.value || undefined })
              }
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
              data-testid="stats-filter-since"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              To
            </span>
            <input
              type="date"
              value={value.until ?? ''}
              min={value.since ?? undefined}
              onChange={(e) =>
                onChange({ ...value, until: e.target.value || undefined })
              }
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
              data-testid="stats-filter-until"
            />
          </label>
        </div>
      )}

      {value.kind === 'lastN' && (
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-600 dark:text-slate-400">Show last</span>
          <select
            value={value.n}
            onChange={(e) =>
              onChange({ kind: 'lastN', n: Number(e.target.value) as LastNCount })
            }
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
            data-testid="stats-filter-lastn"
          >
            {LAST_N_COUNTS.map((n) => (
              <option key={n} value={n}>
                {n} games
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
