import type { X01ViewModel } from '@/games/x01';

type Props = { view: X01ViewModel };

export function X01ScoreHeader({ view }: Props) {
  const { config, remaining, opened, status } = view;
  return (
    <header className="rounded-xl bg-slate-900 p-5 text-slate-100 shadow-md dark:bg-slate-950">
      <div
        className="text-center text-5xl font-bold tabular-nums"
        data-testid="x01-remaining"
      >
        {remaining}
      </div>
      <div className="mt-1 text-center text-xs text-slate-400" data-testid="x01-status">
        {status === 'completed' && 'Match won'}
        {status === 'forfeited' && 'Forfeited'}
        {status === 'in_progress' && config.inRule === 'double' && !opened && 'Double-in required'}
        {status === 'in_progress' && (config.inRule === 'straight' || opened) && 'Your throw'}
      </div>
    </header>
  );
}
