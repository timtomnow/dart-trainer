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
  const slots = [0, 1, 2] as const;
  return (
    <div className="mt-4">
      <div
        className="grid grid-cols-3 gap-2 text-center"
        aria-label="Current turn darts"
        data-testid="x01-current-turn"
      >
        {slots.map((i) => {
          const dart = currentTurn.darts[i];
          return (
            <div
              key={i}
              className="rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              data-testid={`x01-dart-${i}`}
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">Dart {i + 1}</div>
              <div className="mt-1 font-semibold tabular-nums">
                {dart ? formatDart(dart) : '—'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {dart ? `+${dart.scored}` : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          Turn total:{' '}
          <span className="font-semibold tabular-nums" data-testid="x01-turn-scored">
            {currentTurn.scored}
          </span>
          {currentTurn.bust && (
            <span className="ml-2 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
              BUST
            </span>
          )}
        </span>
        {lastClosedTurn && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Last turn:{' '}
            {lastClosedTurn.bust
              ? 'bust'
              : lastClosedTurn.checkout
                ? `out +${lastClosedTurn.scored}`
                : `+${lastClosedTurn.scored}`}
          </span>
        )}
      </div>
    </div>
  );
}
