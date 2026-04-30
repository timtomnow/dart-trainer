import { useState } from 'react';
import { RULES } from './rulesContent';
import { useUiPrefs } from '@/hooks';
import { vibrateTap } from '@/lib/feedback';
import { Modal } from '@/ui/primitives';

type Props = {
  gameId: string;
  className?: string;
};

export function RulesHelpButton({ gameId, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const { haptics } = useUiPrefs();
  const rule = RULES[gameId];
  if (!rule) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => { vibrateTap(haptics); setOpen(true); }}
        aria-label="Game rules"
        title="How to play"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white ${className}`}
        data-testid={`rules-help-${gameId}`}
      >
        <span aria-hidden="true" className="font-serif italic">i</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={rule.title}>
        {rule.body}
      </Modal>
    </>
  );
}
