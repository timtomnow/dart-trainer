import { useState } from 'react';
import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import type { RtwScoringOrder } from '@/games/rtw-scoring/config';
import { useRtwScoringStats } from '@/hooks/useRtwScoringStats';
import { fmtPct } from '@/stats/formatters';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';
import { RankedList } from '@/ui/stats/RankedList';
import { StatBars } from '@/ui/stats/StatBars';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmt1(n: number): string {
  return n.toFixed(1);
}

export function Panel({ profileId, filter }: StatsPanelProps) {
  const [order, setOrder] = useState<RtwScoringOrder | ''>('');
  const { loading, orders, aggregate } = useRtwScoringStats(
    profileId,
    filter,
    order || undefined
  );

  if (loading) return <StatsLoading />;

  return (
    <div className="space-y-6">
      {orders.length > 1 && (
        <label className="block" data-testid="rtws-order-filter">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Order
          </span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as RtwScoringOrder | '')}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="">All orders</option>
            {orders.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      )}

      {!aggregate ? (
        <StatsEmpty message="No sessions in this range. Play one, or widen the filters." />
      ) : (
        <>
          <StatsSection title="Overview">
            <KpiGrid>
              <KpiCard label="Sessions" value={String(aggregate.totalSessions)} />
              <KpiCard label="Total darts" value={String(aggregate.totalDarts)} />
              <KpiCard label="Total hits" value={String(aggregate.totalHits)} />
              <KpiCard label="Total misses" value={String(aggregate.totalMisses)} />
            </KpiGrid>
          </StatsSection>

          <StatsSection title="Top scores">
            <RankedList
              emptyHint="No completed sessions yet."
              rows={aggregate.topScores.map((s) => ({
                id: `${s.sessionId}-${s.date}`,
                primary: `${s.score} pts`,
                secondary: fmtDate(s.date)
              }))}
            />
          </StatsSection>

          <StatsSection title="Per-session averages">
            <KpiGrid>
              <KpiCard label="Avg points" value={fmt1(aggregate.avgPoints)} />
              <KpiCard label="Avg singles" value={fmt1(aggregate.avgSingles)} />
              <KpiCard label="Avg doubles" value={fmt1(aggregate.avgDoubles)} />
              <KpiCard label="Avg triples" value={fmt1(aggregate.avgTriples)} />
              <KpiCard label="Avg misses" value={fmt1(aggregate.avgMisses)} />
            </KpiGrid>
          </StatsSection>

          <StatsSection title="Per-session bests">
            <KpiGrid>
              <KpiCard label="Max singles" value={String(aggregate.maxSingles)} />
              <KpiCard label="Max doubles" value={String(aggregate.maxDoubles)} />
              <KpiCard label="Max triples" value={String(aggregate.maxTriples)} />
              <KpiCard label="Fewest misses" value={String(aggregate.lowestMisses)} />
            </KpiGrid>
          </StatsSection>

          <StatsSection title="Accuracy by number (hit rate)">
            <StatBars
              max={1}
              rows={aggregate.byNumber.map((b) => ({
                id: `acc-${b.target}`,
                label: b.label,
                value: b.accuracy,
                display: b.accuracy !== null ? fmtPct(b.accuracy) : '—'
              }))}
            />
          </StatsSection>

          <StatsSection title="Average points by number">
            <StatBars
              max={3}
              rows={aggregate.byNumber.map((b) => ({
                id: `pts-${b.target}`,
                label: b.label,
                value: b.avgPoints,
                display: b.avgPoints !== null ? b.avgPoints.toFixed(2) : '—'
              }))}
            />
          </StatsSection>
        </>
      )}
    </div>
  );
}
