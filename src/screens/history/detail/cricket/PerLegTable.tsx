import type { GameEvent, Session } from '@/domain/types';
import { parseCricketConfig } from '@/games/cricket/config';
import { buildCricketState } from '@/games/cricket/replay';

type Props = {
  session: Session;
  events: GameEvent[];
  participantId: string;
};

export function CricketPerLegTable({ session, events, participantId }: Props) {
  const config = parseCricketConfig(session.gameConfig);
  const state = buildCricketState(events, config, session.participants, session.id);

  const rows = state.legs.map((leg) => {
    const myTurns = leg.turns.filter((t) => t.participantId === participantId && t.closed);
    const darts = myTurns.reduce((s, t) => s + t.darts.length, 0);
    const marks = myTurns.reduce((s, t) => s + t.marked, 0);
    const points = myTurns.reduce((s, t) => s + t.scored, 0);
    return {
      legIndex: leg.index,
      darts,
      marks,
      points,
      won: leg.winnerParticipantId === participantId,
      ended: Boolean(leg.endedAt)
    };
  });

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No legs recorded.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid={`cricket-leg-table-${participantId}`}>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
            <th className="pb-2 pr-4 font-medium">Leg</th>
            <th className="pb-2 pr-4 font-medium">Darts</th>
            <th className="pb-2 pr-4 font-medium">Marks</th>
            <th className="pb-2 pr-4 font-medium">Points</th>
            <th className="pb-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.legIndex}
              className="border-b border-slate-100 dark:border-slate-800"
              data-testid={`cricket-leg-row-${participantId}-${r.legIndex}`}
            >
              <td className="py-2 pr-4 tabular-nums">{r.legIndex + 1}</td>
              <td className="py-2 pr-4 tabular-nums">{r.darts || '—'}</td>
              <td className="py-2 pr-4 tabular-nums">{r.marks}</td>
              <td className="py-2 pr-4 tabular-nums">{r.points}</td>
              <td
                className={`py-2 font-medium ${
                  r.won
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : r.ended
                      ? 'text-slate-400'
                      : 'text-slate-300'
                }`}
              >
                {r.won ? 'Won' : r.ended ? '—' : 'In progress'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
