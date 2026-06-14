export type RankedRow = { id: string; primary: string; secondary: string };

type Props = {
  rows: RankedRow[];
  emptyHint: string;
};

export function RankedList({ rows, emptyHint }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm italic text-slate-500 dark:text-slate-400">{emptyHint}</p>;
  }

  return (
    <ol className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {rows.map((row, i) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-slate-800"
        >
          <span className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums text-slate-400 dark:text-slate-500">
              #{i + 1}
            </span>
            <span className="text-lg font-semibold tabular-nums">{row.primary}</span>
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{row.secondary}</span>
        </li>
      ))}
    </ol>
  );
}
