import type { X01ViewModel } from '@/games/x01';

type Props = { view: X01ViewModel };

const OUT_LABEL: Record<X01ViewModel['config']['outRule'], string> = {
  straight: 'straight-out',
  double: 'double-out',
  masters: 'masters-out'
};

export function X01ScoreHeader({ view }: Props) {
  const { config, remaining, opened, activeParticipantId, legsWon, legIndex, status } =
    view;
  const won = legsWon[activeParticipantId] ?? 0;
  return (
    <header className="rounded-xl bg-slate-900 p-5 text-slate-100 shadow-md dark:bg-slate-950">
      <div className="flex items-start justify-between text-xs uppercase tracking-wide text-slate-400">
        <span>
          {config.startScore} · {OUT_LABEL[config.outRule]}
          {config.inRule === 'double' && ' · double-in'}
        </span>
        <span data-testid="x01-legs">
          Leg {legIndex + 1} · Won {won}/{config.legsToWin}
        </span>
      </div>
      <div
        className="mt-2 text-5xl font-bold tabular-nums"
        data-testid="x01-remaining"
      >
        {remaining}
      </div>
      <div className="mt-1 text-xs text-slate-400" data-testid="x01-status">
        {status === 'completed' && 'Match won'}
        {status === 'forfeited' && 'Forfeited'}
        {status === 'in_progress' && config.inRule === 'double' && !opened && 'Double-in required'}
        {status === 'in_progress' && (config.inRule === 'straight' || opened) && 'Your throw'}
      </div>
    </header>
  );
}
