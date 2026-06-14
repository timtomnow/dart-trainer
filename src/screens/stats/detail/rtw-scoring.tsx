import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import { useRtwStats } from '@/hooks/useRtwStats';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';

export function Panel({ profileId, filter }: StatsPanelProps) {
  const { loading, rtwScoringGroups } = useRtwStats(profileId, filter);

  if (loading) return <StatsLoading />;
  if (rtwScoringGroups.length === 0)
    return <StatsEmpty message="No sessions in this range. Play one, or widen the filter." />;

  return (
    <div className="space-y-6">
      {rtwScoringGroups.map(({ key, agg }) => (
        <StatsSection
          key={key.order}
          title={`${key.order} — ${agg.sessionCount} session${agg.sessionCount !== 1 ? 's' : ''}`}
        >
          <KpiGrid>
            <KpiCard label="Avg points" value={agg.avgScore.toFixed(0)} />
            <KpiCard label="Best points" value={String(agg.bestScore)} />
            <KpiCard label="Avg targets hit" value={agg.avgTargetsHit.toFixed(1)} />
            <KpiCard label="Sessions" value={String(agg.sessionCount)} />
          </KpiGrid>
        </StatsSection>
      ))}
    </div>
  );
}
