import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ConfigGrid({ children }: Props) {
  return (
    <dl
      className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"
      data-testid="detail-config-grid"
    >
      {children}
    </dl>
  );
}

export function ConfigItem({
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
      <dd className="font-medium" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
