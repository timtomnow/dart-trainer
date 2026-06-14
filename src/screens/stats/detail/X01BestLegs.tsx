import type { BestLeg } from '@/stats/x01Legs';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function X01BestLegs({ legs }: { legs: BestLeg[] }) {
  if (legs.length === 0) {
    return (
      <p className="text-sm italic text-slate-500 dark:text-slate-400">
        No completed legs yet. Win a leg to record your best.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {legs.map((leg, i) => (
        <li
          key={`${leg.sessionId}-${leg.date}-${i}`}
          className="flex items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-slate-800"
        >
          <span className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums text-slate-400 dark:text-slate-500">
              #{i + 1}
            </span>
            <span className="text-lg font-semibold tabular-nums">{leg.darts} darts</span>
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{fmtDate(leg.date)}</span>
        </li>
      ))}
    </ol>
  );
}
