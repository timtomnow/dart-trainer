export type StatBarRow = {
  id: string;
  label: string;
  /** 0..max; null renders an empty bar with an em dash. */
  value: number | null;
  display: string;
};

type Props = {
  rows: StatBarRow[];
  max: number;
};

export function StatBars({ rows, max }: Props) {
  return (
    <div className="space-y-1.5">
      {rows.map((row) => {
        const pct = row.value !== null && max > 0 ? (row.value / max) * 100 : 0;
        return (
          <div key={row.id} className="flex items-center gap-3 text-sm">
            <span className="w-10 shrink-0 text-right tabular-nums text-slate-600 dark:text-slate-400">
              {row.label}
            </span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded bg-indigo-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 shrink-0 text-right tabular-nums">{row.display}</span>
          </div>
        );
      })}
    </div>
  );
}
