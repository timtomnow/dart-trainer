import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import { useCheckoutStats } from '@/hooks/useCheckoutStats';
import { fmtPct } from '@/stats/formatters';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';
import { StatBars } from '@/ui/stats/StatBars';

export function Panel({ profileId, filter }: StatsPanelProps) {
  const { loading, aggregate } = useCheckoutStats(profileId, filter);

  if (loading) return <StatsLoading />;
  if (!aggregate) return <StatsEmpty message="No sessions in this range. Play one, or widen the filter." />;

  return (
    <div className="space-y-6">
      <StatsSection title="Overview">
        <KpiGrid>
          <KpiCard label="Sessions" value={String(aggregate.totalSessions)} />
          <KpiCard label="Attempts" value={String(aggregate.totalAttempts)} />
          <KpiCard label="Successes" value={String(aggregate.totalSuccesses)} />
          <KpiCard label="Success rate" value={aggregate.successRate !== null ? fmtPct(aggregate.successRate) : '—'} />
        </KpiGrid>
      </StatsSection>

      <StatsSection title="Accuracy by finish (hit rate)">
        <StatBars
          max={1}
          rows={aggregate.byFinish.map((f) => ({
            id: `rate-${f.finish}`,
            label: String(f.finish),
            value: f.rate,
            display: f.rate !== null ? fmtPct(f.rate) : '—'
          }))}
        />
      </StatsSection>

      <StatsSection title="Successes by finish (hits / attempts)">
        <StatBars
          max={1}
          rows={aggregate.byFinish.map((f) => ({
            id: `frac-${f.finish}`,
            label: String(f.finish),
            value: f.rate,
            display: `${f.successes}/${f.attempts}`
          }))}
        />
      </StatsSection>
    </div>
  );
}
