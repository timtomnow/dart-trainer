import type { CricketTarget } from '@/games/cricket';

type Props = {
  marks: Record<string, Record<number, number>>;
  participantIds: string[];
  activeParticipantId: string;
  pointsPerTurn: Record<string, number>;
};

const LEFT_TARGETS: CricketTarget[] = [15, 16, 17, 18];
const RIGHT_TARGETS: CricketTarget[] = [19, 20, 25];

function renderMarks(count: number): string {
  if (count <= 0) return '';
  if (count === 1) return '/';
  if (count === 2) return 'X';
  return 'O';
}

export function CricketScoreboard({ marks, participantIds, activeParticipantId, pointsPerTurn }: Props) {
  const pid = participantIds[0] ?? activeParticipantId;

  const rowBase = 'grid grid-cols-2 border-t border-slate-100 dark:border-slate-800 first:border-0';

  const cell = (target: CricketTarget) => {
    const allClosed = participantIds.every((p) => (marks[p]?.[target] ?? 0) >= 3);
    const label = target === 25 ? 'Bull' : String(target);
    return (
      <div key={target} className={`${rowBase} ${allClosed ? 'opacity-40' : ''}`}>
        <div className="py-2 pl-3 font-semibold tabular-nums">{label}</div>
        <div
          className="py-2 pr-3 text-center font-bold tabular-nums"
          data-testid={`cricket-marks-${pid}-${target}`}
        >
          {renderMarks(marks[pid]?.[target] ?? 0)}
        </div>
      </div>
    );
  };

  const ppt = pointsPerTurn[pid] ?? 0;

  return (
    <div
      className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
      data-testid="cricket-scoreboard"
    >
      <div className="grid grid-cols-2 divide-x divide-slate-200 text-sm dark:divide-slate-700">
        <div>{LEFT_TARGETS.map(cell)}</div>
        <div>
          {RIGHT_TARGETS.map(cell)}
          <div className={`${rowBase} bg-slate-50 dark:bg-slate-800/60`}>
            <div className="py-2 pl-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              Pts/turn
            </div>
            <div
              className="py-2 pr-3 text-center font-semibold tabular-nums"
              data-testid={`cricket-ppt-${pid}`}
            >
              {ppt > 0 ? ppt.toFixed(1) : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
