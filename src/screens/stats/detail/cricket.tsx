import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import { useCricketStats } from '@/hooks/useCricketStats';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';

export function Panel({ profileId, filter }: StatsPanelProps) {
  const { loading, aggregate } = useCricketStats(profileId, filter);

  if (loading) return <StatsLoading />;
  if (!aggregate) return <StatsEmpty message="No sessions in this range. Play one, or widen the filter." />;

  return (
    <StatsSection title={`Totals — ${aggregate.sessionCount} session${aggregate.sessionCount !== 1 ? 's' : ''}`}>
      <KpiGrid>
        <KpiCard label="Marks per round" value={aggregate.marksPerRound.toFixed(2)} />
        <KpiCard label="Total marks" value={String(aggregate.totalMarks)} />
        <KpiCard label="Sessions" value={String(aggregate.sessionCount)} />
      </KpiGrid>
    </StatsSection>
  );
}
