import type { TurnsToWinBucket } from '@/stats/x01Legs';

export function X01TurnsToWin({ buckets }: { buckets: TurnsToWinBucket[] }) {
  if (buckets.length === 0) {
    return (
      <p className="text-sm italic text-slate-500 dark:text-slate-400">
        No completed legs in this range.
      </p>
    );
  }

  const max = Math.max(...buckets.map((b) => b.count));

  return (
    <div className="space-y-1.5" data-testid="x01-turns-to-win">
      {buckets.map((b) => (
        <div key={b.turns} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 tabular-nums text-slate-600 dark:text-slate-400">
            {b.turns} visit{b.turns !== 1 ? 's' : ''}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded bg-indigo-500"
              style={{ width: `${(b.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right tabular-nums">{b.count}</span>
        </div>
      ))}
    </div>
  );
}
