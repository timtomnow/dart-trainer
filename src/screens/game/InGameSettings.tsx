import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, type Theme } from '@/app/providers/ThemeProvider';
import { useUiPrefs } from '@/hooks';
import { Modal, ToggleRow } from '@/ui/primitives';

const THEMES: ReadonlyArray<Theme> = ['light', 'dark', 'system'];

type Props = {
  className?: string;
};

export function InGameSettings({ className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { sound, haptics, setSound, setHaptics } = useUiPrefs();

  const goToFullSettings = () => {
    setOpen(false);
    navigate('/settings');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Settings"
        title="Settings"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white ${className}`}
        data-testid="in-game-settings-button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473a6 6 0 0 1 1.108.642l1.434-.46a1 1 0 0 1 1.18.444l.681 1.18a1 1 0 0 1-.205 1.251l-1.137 1a6 6 0 0 1 0 1.279l1.137 1a1 1 0 0 1 .205 1.251l-.68 1.18a1 1 0 0 1-1.18.444l-1.435-.46a6 6 0 0 1-1.108.642l-.295 1.473a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6 6 0 0 1-1.108-.642l-1.434.46a1 1 0 0 1-1.18-.444l-.681-1.18a1 1 0 0 1 .205-1.252l1.137-.999a6 6 0 0 1 0-1.279l-1.137-1a1 1 0 0 1-.205-1.25l.68-1.18a1 1 0 0 1 1.18-.445l1.435.46a6 6 0 0 1 1.108-.642l.295-1.473ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Settings">
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Theme
            </h4>
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

          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Sound &amp; feedback
            </h4>
            <div className="mt-1 divide-y divide-slate-200 dark:divide-slate-700">
              <ToggleRow label="Sound" checked={sound} onChange={setSound} />
              <ToggleRow label="Haptics" checked={haptics} onChange={setHaptics} />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={goToFullSettings}
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Full Settings &rarr;
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
