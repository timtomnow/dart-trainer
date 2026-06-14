import type { StatsFilter } from '@/stats/filter';

export type StatsPanelProps = {
  profileId: string;
  filter: StatsFilter;
};

export function StatsLoading() {
  return <p className="text-slate-500 dark:text-slate-400">Loading…</p>;
}

export function StatsEmpty({ message }: { message: string }) {
  return (
    <div
      data-testid="game-stats-empty"
      className="rounded-md border border-dashed border-slate-300 p-6 text-center dark:border-slate-700"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </div>
  );
}

export function StatsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-slate-600 dark:text-slate-400">{title}</h2>
      {children}
    </div>
  );
}
