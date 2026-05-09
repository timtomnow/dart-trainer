import type { GameEvent, Session } from '@/domain/types';
import { parseRtwConfig } from '@/games/rtw/config';
import { buildRtwState } from '@/games/rtw/replay';

type Props = {
  session: Session;
  events: GameEvent[];
  participantId: string;
};

function targetLabel(value: number): string {
  return value === 25 ? 'Bull' : String(value);
}

export function RtwPerTargetTable({ session, events, participantId }: Props) {
  const config = parseRtwConfig(session.gameConfig);
  const state = buildRtwState(events, config, session.participants, session.id);

  const advancedIndex = state.participantTargetIndices[participantId] ?? 0;

  const rows = state.targetSequence.map((targetValue, targetIndex) => {
    const myTurns = state.turns.filter(
      (t) => t.participantId === participantId && t.targetIndexAtStart === targetIndex
    );
    const darts = myTurns.reduce((s, t) => s + t.dartsInTurn, 0);
    const hits = myTurns.reduce((s, t) => s + t.hitsInTurn, 0);
    const cleared = advancedIndex > targetIndex;
    const attempted = darts > 0 || cleared;
    return { targetIndex, targetValue, darts, hits, cleared, attempted };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid={`rtw-target-table-${participantId}`}>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
            <th className="pb-2 pr-4 font-medium">#</th>
            <th className="pb-2 pr-4 font-medium">Target</th>
            <th className="pb-2 pr-4 font-medium">Darts</th>
            <th className="pb-2 pr-4 font-medium">Hits</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.targetIndex}
              className="border-b border-slate-100 dark:border-slate-800"
              data-testid={`rtw-target-row-${participantId}-${r.targetIndex}`}
            >
              <td className="py-2 pr-4 tabular-nums">{r.targetIndex + 1}</td>
              <td className="py-2 pr-4 font-medium">{targetLabel(r.targetValue)}</td>
              <td className="py-2 pr-4 tabular-nums">{r.darts || (r.attempted ? 0 : '—')}</td>
              <td className="py-2 pr-4 tabular-nums">{r.hits || (r.attempted ? 0 : '—')}</td>
              <td
                className={`py-2 font-medium ${
                  r.cleared
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : r.attempted
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-400'
                }`}
              >
                {r.cleared ? 'Cleared' : r.attempted ? 'Missed' : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
