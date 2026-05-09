import { formatPct } from '../shared/format';
import type { GameEvent, Session } from '@/domain/types';
import { parseCheckoutConfig } from '@/games/checkout/config';
import { computeCheckoutStats } from '@/stats/checkoutStats';

type Props = {
  session: Session;
  events: GameEvent[];
};

export function CheckoutPerFinishTable({ session, events }: Props) {
  const config = parseCheckoutConfig(session.gameConfig);
  const stats = computeCheckoutStats(events, config, session);

  if (stats.perFinish.length === 0) {
    return <p className="text-sm text-slate-500">No finishes attempted.</p>;
  }

  const rows = [...stats.perFinish].sort((a, b) => b.finish - a.finish);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="checkout-finish-table">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
            <th className="pb-2 pr-4 font-medium">Finish</th>
            <th className="pb-2 pr-4 font-medium">Attempts</th>
            <th className="pb-2 pr-4 font-medium">Successes</th>
            <th className="pb-2 pr-4 font-medium">Success %</th>
            <th className="pb-2 font-medium">Best darts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.finish}
              className="border-b border-slate-100 dark:border-slate-800"
              data-testid={`checkout-finish-row-${r.finish}`}
            >
              <td className="py-2 pr-4 font-medium tabular-nums">{r.finish}</td>
              <td className="py-2 pr-4 tabular-nums">{r.attempts}</td>
              <td className="py-2 pr-4 tabular-nums">{r.successes}</td>
              <td className="py-2 pr-4 tabular-nums">{formatPct(r.successRate)}</td>
              <td className="py-2 tabular-nums">
                {r.bestDarts !== null ? r.bestDarts : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
