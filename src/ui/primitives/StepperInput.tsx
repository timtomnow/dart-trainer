import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  value: number;
  min: number;
  max: number;
  onValue: (next: number) => void;
};

export function StepperInput({ value, min, max, onValue, className = '', ...divProps }: Props) {
  return (
    <div className={`mt-1 flex items-center ${className}`} {...divProps}>
      <button
        type="button"
        onClick={() => onValue(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease"
        className="flex h-9 w-10 items-center justify-center rounded-l-md border border-slate-300 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        −
      </button>
      <div
        className="flex h-9 flex-1 items-center justify-center border-y border-slate-300 bg-white text-sm font-semibold tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-live="polite"
      >
        {value}
      </div>
      <button
        type="button"
        onClick={() => onValue(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase"
        className="flex h-9 w-10 items-center justify-center rounded-r-md border border-slate-300 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        +
      </button>
    </div>
  );
}
