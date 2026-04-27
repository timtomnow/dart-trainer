import { useQuotaHint } from '@/hooks';

export function QuotaHint() {
  const { active, dismiss } = useQuotaHint();
  if (!active) return null;

  return (
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
        onClick={dismiss}
        className="rounded-md border border-amber-400 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
      >
        Dismiss
      </button>
    </div>
  );
}
