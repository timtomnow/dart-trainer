import type { X01ViewModel } from '@/games/x01';

type Props = { view: X01ViewModel };

function formatDart(d: { segment: string; value: number }): string {
  if (d.segment === 'MISS') return 'miss';
  if (d.segment === 'SB') return '25';
  if (d.segment === 'DB') return 'D25';
  return `${d.segment}${d.value / (d.segment === 'T' ? 3 : d.segment === 'D' ? 2 : 1)}`;
}

export function X01TurnStrip({ view }: Props) {
  const { currentTurn, lastClosedTurn } = view;
  const slots = [0, 1] as const;
  return (
    <div className="mt-3" aria-label="Current turn darts" data-testid="x01-current-turn">
      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((i) => {
          const dart = currentTurn.darts[i];
          return (
            <div
              key={i}
              className="rounded border border-slate-200 bg-white px-1.5 py-1.5 text-center text-xs dark:border-slate-700 dark:bg-slate-900"
              data-testid={`x01-dart-${i}`}
            >
              <div className="text-slate-500 dark:text-slate-400">D{i + 1}</div>
              <div className="font-semibold tabular-nums">{dart ? formatDart(dart) : '—'}</div>
              <div className="text-slate-500 dark:text-slate-400">
                {dart ? `+${dart.scored}` : '\u00a0'}
              </div>
            </div>
          );
        })}
        <div className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center text-xs dark:border-slate-700 dark:bg-slate-800">
          <div className="text-slate-500 dark:text-slate-400">Turn</div>
          <div className="font-semibold tabular-nums" data-testid="x01-turn-scored">
            {currentTurn.scored}
          </div>
          {currentTurn.bust ? (
            <div className="rounded bg-red-600 px-1 text-[10px] font-semibold text-white">
              BUST
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400">{'\u00a0'}</div>
          )}
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1.5 text-center text-xs dark:border-slate-700 dark:bg-slate-800">
          <div className="text-slate-500 dark:text-slate-400">Last</div>
          <div className="font-semibold tabular-nums">
            {lastClosedTurn
              ? lastClosedTurn.bust
                ? 'bust'
                : `+${lastClosedTurn.scored}`
              : '—'}
          </div>
          <div className="text-slate-500 dark:text-slate-400">
            {lastClosedTurn?.checkout ? 'out' : '\u00a0'}
          </div>
        </div>
      </div>
    </div>
  );
}
