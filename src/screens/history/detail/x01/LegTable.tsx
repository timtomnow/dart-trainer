import { formatAvg } from '../shared/format';
import type { GameEvent, Session } from '@/domain/types';
import { parseX01Config } from '@/games/x01/config';
import { buildX01State } from '@/games/x01/replay';
import { computeX01LegBreakdowns } from '@/stats/x01Session';

type Props = {
  session: Session;
  events: GameEvent[];
  participantId: string;
  testId?: string;
};

export function X01LegTable({ session, events, participantId, testId }: Props) {
  const config = parseX01Config(session.gameConfig);
  const state = buildX01State(events, config, session.participants, session.id);
  const breakdowns = computeX01LegBreakdowns(state.legs, participantId, config);

  if (breakdowns.length === 0) {
    return <p className="text-sm text-slate-500">No legs recorded.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid={testId ?? 'x01-leg-table'}>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
            <th className="pb-2 pr-4 font-medium">Leg</th>
            <th className="pb-2 pr-4 font-medium">Darts</th>
            <th className="pb-2 pr-4 font-medium">Checkout</th>
            <th className="pb-2 pr-4 font-medium">3-dart avg</th>
            <th className="pb-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {breakdowns.map((leg) => {
            const won = leg.winnerParticipantId === participantId;
            return (
              <tr
                key={leg.legIndex}
                className="border-b border-slate-100 dark:border-slate-800"
                data-testid={`leg-row-${leg.legIndex}`}
              >
                <td className="py-2 pr-4 tabular-nums">{leg.legIndex + 1}</td>
                <td className="py-2 pr-4 tabular-nums">{leg.dartsUsed || '—'}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {leg.checkoutValue > 0 ? leg.checkoutValue : '—'}
                </td>
                <td className="py-2 pr-4 tabular-nums">{formatAvg(leg.legStats.threeDartAvg)}</td>
                <td
                  className={`py-2 font-medium ${
                    won ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {won ? 'Won' : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
