import type { X01ViewModel } from '@/games/x01';

type Props = {
  view: X01ViewModel;
  participantNames?: Record<string, string>;
};

export function X01ScoreHeader({ view, participantNames }: Props) {
  const { config, remaining, opened, status } = view;
  const isMulti = view.participantIds.length > 1;
  const isOver = status !== 'in_progress';

  if (isMulti) {
    return (
      <header className="grid grid-cols-2 gap-3" data-testid="x01-scoreboard">
        {view.participantIds.map((pid) => {
          const isActive = pid === view.activeParticipantId;
          const name = participantNames?.[pid] ?? pid;
          const score = view.participantRemaining[pid] ?? config.startScore;
          const legsWon = view.legsWon[pid] ?? 0;
          const highlight = isActive && !isOver;
          return (
            <div
              key={pid}
              data-testid={`x01-player-${pid}`}
              data-active={highlight ? 'true' : 'false'}
              className={`rounded-xl p-5 shadow-md ${
                highlight
                  ? 'bg-slate-900 text-slate-100 dark:bg-slate-950'
                  : 'bg-slate-700 text-slate-300 dark:bg-slate-800'
              }`}
            >
              <div className="mb-1 truncate text-center text-sm font-medium text-slate-300">
                {name}
                <span className="ml-2 text-xs text-slate-400">{legsWon}/{config.legsToWin}</span>
              </div>
              <div className="text-center text-5xl font-bold tabular-nums" data-testid={`x01-remaining-${pid}`}>
                {score}
              </div>
              <div className="mt-1 text-center text-xs text-slate-400">
                {isOver && pid === view.winnerParticipantId && 'Winner'}
                {!isOver && highlight &&
                  (config.inRule === 'double' && !opened ? 'Double-in required' : 'Their throw')}
                {(isOver && pid !== view.winnerParticipantId) || (!isOver && !highlight) ? ' ' : ''}
              </div>
            </div>
          );
        })}
      </header>
    );
  }

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
