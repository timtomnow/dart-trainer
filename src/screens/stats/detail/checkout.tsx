import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import { useCheckoutStats } from '@/hooks/useCheckoutStats';
import { fmtPct } from '@/stats/formatters';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';

export function Panel({ profileId, filter }: StatsPanelProps) {
  const { loading, agg } = useCheckoutStats(profileId, filter);

  if (loading) return <StatsLoading />;
  if (!agg) return <StatsEmpty message="No sessions in this range. Play one, or widen the filter." />;

  return (
    <StatsSection title={`Totals — ${agg.sessionCount} session${agg.sessionCount !== 1 ? 's' : ''}`}>
      <KpiGrid>
        <KpiCard label="Success rate" value={agg.avgSuccessRate !== null ? fmtPct(agg.avgSuccessRate) : '—'} />
        <KpiCard label="Best finish hit" value={agg.bestHardestFinish !== null ? String(agg.bestHardestFinish) : '—'} />
        <KpiCard label="Avg attempts" value={agg.avgAttemptsPerSession.toFixed(1)} />
        <KpiCard label="Sessions" value={String(agg.sessionCount)} />
      </KpiGrid>
    </StatsSection>
  );
}
