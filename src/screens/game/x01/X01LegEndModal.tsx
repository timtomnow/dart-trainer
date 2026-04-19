import type { X01Config, X01LegStats } from '@/games/x01';

type Props = {
  completedLegNumber: number;
  legsWon: Record<string, number>;
  participantId: string;
  config: X01Config;
  stats: X01LegStats;
  onContinue: () => void;
  onClose: () => void;
};

function fmt(n: number): string {
  return n.toFixed(2);
}

function fmtPct(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)}%`;
}

export function X01LegEndModal({
  completedLegNumber,
  legsWon,
  participantId,
  config,
  stats,
  onContinue,
  onClose
}: Props) {
  const won = legsWon[participantId] ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Leg complete"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Leg {completedLegNumber} complete</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Won {won} / {config.legsToWin}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close"
          >
            &#x2715;
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">3-dart avg</dt>
            <dd className="font-semibold tabular-nums">{fmt(stats.threeDartAvg)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">First-9 avg</dt>
            <dd className="font-semibold tabular-nums">
              {stats.firstNineAvg === null ? '—' : fmt(stats.firstNineAvg)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Checkout %</dt>
            <dd className="font-semibold tabular-nums">{fmtPct(stats.checkoutPct)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Highest finish</dt>
            <dd className="font-semibold tabular-nums">{stats.highestFinish || '—'}</dd>
          </div>
        </dl>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Review / Undo
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            data-testid="x01-leg-continue"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
