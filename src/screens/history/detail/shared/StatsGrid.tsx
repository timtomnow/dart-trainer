import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  testId?: string;
};

export function StatsGrid({ children, testId }: Props) {
  return (
    <dl
      className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60 sm:grid-cols-4"
      data-testid={testId}
    >
      {children}
    </dl>
  );
}

export function StatCard({
  label,
  value,
  testId
}: {
  label: string;
  value: ReactNode;
  testId?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-semibold tabular-nums" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
