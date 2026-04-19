import { useTheme, type Theme } from '@/app/providers/ThemeProvider';

const THEMES: ReadonlyArray<Theme> = ['light', 'dark', 'system'];

export function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</h2>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900"
        >
          {THEMES.map((t) => {
            const active = theme === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(t)}
                className={[
                  'rounded-md px-3 py-1.5 text-sm capitalize transition-colors',
                  active
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                ].join(' ')}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
