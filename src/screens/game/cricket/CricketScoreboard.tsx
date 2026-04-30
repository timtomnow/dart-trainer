import type { ThrowSegment } from '@/domain/types';
import type { CricketTarget } from '@/games/cricket';

type DartEntry = {
  segment: ThrowSegment;
  target: CricketTarget | null;
};

type Props = {
  marks: Record<string, Record<number, number>>;
  participantIds: string[];
  activeParticipantId: string;
  currentTurnDarts: DartEntry[];
};

const LEFT_TARGETS: CricketTarget[] = [15, 16, 17, 18];
const RIGHT_TARGETS: CricketTarget[] = [19, 20, 25];

function renderMarks(count: number): string {
  if (count <= 0) return '';
  if (count === 1) return '/';
  if (count === 2) return 'X';
  return 'O';
}

function dartLabel(d: DartEntry | undefined): string {
  if (!d) return '';
  if (d.target === null) return 'Miss';
  return `${d.segment}${d.target === 25 ? 'Bull' : d.target}`;
}

export function CricketScoreboard({ marks, participantIds, activeParticipantId, currentTurnDarts }: Props) {
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

  return (
    <div
      className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
      data-testid="cricket-scoreboard"
    >
      <div className="grid grid-cols-2 divide-x divide-slate-200 text-sm dark:divide-slate-700">
        <div>{LEFT_TARGETS.map(cell)}</div>
        <div>
          {RIGHT_TARGETS.map(cell)}
          <div className="border-t border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700" data-testid="cricket-turn-darts">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="py-2 text-center text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300"
                >
                  {dartLabel(currentTurnDarts[i])}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
