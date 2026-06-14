import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import { useRtwStats } from '@/hooks/useRtwStats';
import { fmtPct } from '@/stats/formatters';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';

export function Panel({ profileId, filter }: StatsPanelProps) {
  const { loading, rtwGroups } = useRtwStats(profileId, filter);

  if (loading) return <StatsLoading />;
  if (rtwGroups.length === 0)
    return <StatsEmpty message="No sessions in this range. Play one, or widen the filter." />;

  return (
    <div className="space-y-6">
      {rtwGroups.map(({ key, agg }) => (
        <StatsSection
          key={`${key.gameType}|${key.mode}`}
          title={`${key.gameType} / ${key.mode} — ${agg.sessionCount} session${agg.sessionCount !== 1 ? 's' : ''}`}
        >
          <KpiGrid>
            <KpiCard label="Avg targets hit" value={agg.avgTargetsHit.toFixed(1)} />
            <KpiCard label="Hit rate" value={agg.avgHitRatePct !== null ? fmtPct(agg.avgHitRatePct) : '—'} />
            <KpiCard label="Avg darts" value={agg.avgDartsThrown.toFixed(0)} />
            <KpiCard label="Sessions" value={String(agg.sessionCount)} />
          </KpiGrid>
        </StatsSection>
      ))}
    </div>
  );
}
