import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import { useStats } from '@/hooks/useStats';
import { fmtAvg, fmtPct } from '@/stats/formatters';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';
import { TrendChart } from '@/ui/stats/TrendChart';

type Props = StatsPanelProps & { gameModeId: 'x01' | 'x01vc' };

export function X01FamilyPanel({ profileId, filter, gameModeId }: Props) {
  const { loading, aggregate, trend } = useStats(profileId, filter, gameModeId);

  if (loading) return <StatsLoading />;
  if (!aggregate) return <StatsEmpty message="No sessions in this range. Play one, or widen the filter." />;

  return (
    <div className="space-y-6">
      <StatsSection title={`3-dart average — ${trend.length} session${trend.length !== 1 ? 's' : ''}`}>
        <TrendChart
          points={trend.map((p) => ({ sessionId: p.sessionId, value: p.threeDartAvg }))}
          ariaLabel="3-dart average trend"
          emptyHint="Play at least 2 sessions in this range to see a trend."
        />
      </StatsSection>

      <StatsSection title={`Totals — ${aggregate.sessionCount} session${aggregate.sessionCount !== 1 ? 's' : ''}`}>
        <KpiGrid>
          <KpiCard label="3-dart avg" value={fmtAvg(aggregate.threeDartAvg)} />
          <KpiCard label="First-9 avg" value={aggregate.firstNineAvg !== null ? fmtAvg(aggregate.firstNineAvg) : '—'} />
          <KpiCard label="Checkout %" value={aggregate.checkoutPct !== null ? fmtPct(aggregate.checkoutPct) : '—'} />
          <KpiCard label="180s" value={String(aggregate.total180s)} />
          <KpiCard label="Best checkout" value={aggregate.highestCheckout > 0 ? String(aggregate.highestCheckout) : '—'} />
          <KpiCard label="Shortest leg" value={aggregate.shortestLeg !== null ? `${aggregate.shortestLeg} darts` : '—'} />
        </KpiGrid>
      </StatsSection>
    </div>
  );
}
