type Props = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  description?: string;
  disabled?: boolean;
};

export function ToggleRow({ label, checked, onChange, description, disabled }: Props) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm">
        <span className="font-medium text-slate-900 dark:text-white">{label}</span>
        {description && (
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
            checked ? 'translate-x-5' : 'translate-x-0'
          ].join(' ')}
        />
      </button>
    </label>
  );
}
