import type { GameEvent, Session } from '@/domain/types';
import { parseCricketConfig } from '@/games/cricket/config';
import { buildCricketState } from '@/games/cricket/replay';
import { CRICKET_TARGETS, type CricketTarget } from '@/games/cricket/types';

type Props = {
  session: Session;
  events: GameEvent[];
  participantId: string;
};

const TARGET_LABEL: Record<CricketTarget, string> = {
  15: '15',
  16: '16',
  17: '17',
  18: '18',
  19: '19',
  20: '20',
  25: 'Bull'
};

export function CricketPerTargetTable({ session, events, participantId }: Props) {
  const config = parseCricketConfig(session.gameConfig);
  const state = buildCricketState(events, config, session.participants, session.id);

  const allDarts = state.legs
    .flatMap((leg) => leg.turns)
    .filter((t) => t.participantId === participantId && t.closed)
    .flatMap((t) => t.darts);

  const rows = CRICKET_TARGETS.map((target) => {
    const dartsAtTarget = allDarts.filter((d) => d.target === target);
    const dartsCount = dartsAtTarget.length;
    const marks = dartsAtTarget.reduce((s, d) => s + d.marksAwarded, 0);
    const points = dartsAtTarget.reduce((s, d) => s + d.scored, 0);
    const marksPerDart = dartsCount > 0 ? marks / dartsCount : null;

    // "closed by you" across the session: a number is closed by you in any leg
    // where you placed at least 3 marks on it.
    const closedLegs = state.legs.filter(
      (leg) => (leg.marks[participantId]?.[target] ?? 0) >= 3
    ).length;

    return { target, dartsCount, marks, points, marksPerDart, closedLegs };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid={`cricket-target-table-${participantId}`}>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
            <th className="pb-2 pr-4 font-medium">Target</th>
            <th className="pb-2 pr-4 font-medium">Darts</th>
            <th className="pb-2 pr-4 font-medium">Marks</th>
            <th className="pb-2 pr-4 font-medium">Points</th>
            <th className="pb-2 pr-4 font-medium">Marks/dart</th>
            <th className="pb-2 font-medium">Closes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.target}
              className="border-b border-slate-100 dark:border-slate-800"
              data-testid={`cricket-target-row-${participantId}-${r.target}`}
            >
              <td className="py-2 pr-4 font-medium">{TARGET_LABEL[r.target]}</td>
              <td className="py-2 pr-4 tabular-nums">{r.dartsCount}</td>
              <td className="py-2 pr-4 tabular-nums">{r.marks}</td>
              <td className="py-2 pr-4 tabular-nums">{r.points}</td>
              <td className="py-2 pr-4 tabular-nums">
                {r.marksPerDart !== null ? r.marksPerDart.toFixed(2) : '—'}
              </td>
              <td className="py-2 tabular-nums">{r.closedLegs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
