import { CRICKET_TARGETS, type CricketTarget } from '@/games/cricket';

type Props = {
  marks: Record<string, Record<number, number>>;
  score: Record<string, number>;
  participantIds: string[];
  activeParticipantId: string;
};

function renderMarks(count: number): string {
  if (count <= 0) return '';
  if (count === 1) return '/';
  if (count === 2) return 'X';
  return 'O';
}

function targetLabel(t: CricketTarget): string {
  return t === 25 ? 'Bull' : String(t);
}

export function CricketScoreboard({ marks, score, participantIds, activeParticipantId }: Props) {
  return (
    <div
      className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"
      data-testid="cricket-scoreboard"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
            <th className="py-2 pl-3 pr-2 text-left font-medium text-slate-500 dark:text-slate-400">
              Target
            </th>
            {participantIds.map((pid) => (
              <th
                key={pid}
                className={`px-3 py-2 text-center font-medium ${
                  pid === activeParticipantId
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {pid === activeParticipantId ? '▶' : ''} P{participantIds.indexOf(pid) + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(CRICKET_TARGETS as readonly CricketTarget[]).map((target) => {
            const allClosed = participantIds.every(
              (pid) => (marks[pid]?.[target] ?? 0) >= 3
            );
            return (
              <tr
                key={target}
                className={`border-b border-slate-100 last:border-0 dark:border-slate-800 ${
                  allClosed ? 'opacity-40' : ''
                }`}
              >
                <td className="py-2 pl-3 pr-2 font-semibold tabular-nums">{targetLabel(target)}</td>
                {participantIds.map((pid) => {
                  const m = marks[pid]?.[target] ?? 0;
                  return (
                    <td
                      key={pid}
                      className="px-3 py-2 text-center font-bold tabular-nums"
                      data-testid={`cricket-marks-${pid}-${target}`}
                    >
                      {renderMarks(m)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="bg-slate-50 dark:bg-slate-800/60">
            <td className="py-2 pl-3 pr-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Score
            </td>
            {participantIds.map((pid) => (
              <td
                key={pid}
                className="px-3 py-2 text-center font-semibold tabular-nums"
                data-testid={`cricket-score-${pid}`}
              >
                {score[pid] ?? 0}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
