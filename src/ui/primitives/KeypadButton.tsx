import type { ButtonHTMLAttributes } from 'react';

type Variant = 'number' | 'multiplier' | 'multiplier-active' | 'special' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const CLASSES: Record<Variant, string> = {
  number:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  multiplier:
    'bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
  'multiplier-active':
    'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 dark:bg-blue-500',
  special:
    'bg-amber-500 text-white hover:bg-amber-400 active:bg-amber-600 dark:bg-amber-600',
  danger:
    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 dark:bg-red-700'
};

export function KeypadButton({
  variant = 'number',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`flex min-h-[56px] items-center justify-center rounded-lg text-lg font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
