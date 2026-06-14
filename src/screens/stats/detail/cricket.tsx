import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import { useCricketStats } from '@/hooks/useCricketStats';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';
import { RankedList } from '@/ui/stats/RankedList';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmt1(n: number): string {
  return n.toFixed(1);
}

export function Panel({ profileId, filter }: StatsPanelProps) {
  const { loading, aggregate } = useCricketStats(profileId, filter);

  if (loading) return <StatsLoading />;
  if (!aggregate) return <StatsEmpty message="No sessions in this range. Play one, or widen the filter." />;

  return (
    <div className="space-y-6">
      <StatsSection title="Overview">
        <KpiGrid>
          <KpiCard label="Sessions" value={String(aggregate.totalSessions)} />
          <KpiCard label="Total darts" value={String(aggregate.totalDarts)} />
          <KpiCard label="Total marks" value={String(aggregate.totalMarks)} />
          <KpiCard
            label="Marks per round"
            value={aggregate.marksPerRound !== null ? aggregate.marksPerRound.toFixed(2) : '—'}
          />
        </KpiGrid>
      </StatsSection>

      <StatsSection title="Best legs (fewest darts)">
        <RankedList
          emptyHint="No closed boards yet. Win a leg to record your best."
          rows={aggregate.bestLegs.map((l) => ({
            id: `${l.sessionId}-${l.date}-${l.darts}`,
            primary: `${l.darts} darts`,
            secondary: fmtDate(l.date)
          }))}
        />
      </StatsSection>

      <StatsSection title="Hit counts">
        <KpiGrid>
          <KpiCard label="Singles" value={String(aggregate.totalSingles)} />
          <KpiCard label="Doubles" value={String(aggregate.totalDoubles)} />
          <KpiCard label="Triples" value={String(aggregate.totalTriples)} />
          <KpiCard label="Misses" value={String(aggregate.totalMisses)} />
        </KpiGrid>
      </StatsSection>

      <StatsSection title="Per-session averages">
        <KpiGrid>
          <KpiCard label="Avg darts" value={fmt1(aggregate.avgDarts)} />
          <KpiCard label="Avg singles" value={fmt1(aggregate.avgSingles)} />
          <KpiCard label="Avg doubles" value={fmt1(aggregate.avgDoubles)} />
          <KpiCard label="Avg triples" value={fmt1(aggregate.avgTriples)} />
          <KpiCard label="Avg misses" value={fmt1(aggregate.avgMisses)} />
          <KpiCard
            label="Avg darts to finish"
            value={aggregate.avgDartsToComplete !== null ? fmt1(aggregate.avgDartsToComplete) : '—'}
          />
        </KpiGrid>
      </StatsSection>

      <StatsSection title="Per-session bests">
        <KpiGrid>
          <KpiCard label="Max singles" value={String(aggregate.maxSingles)} />
          <KpiCard label="Max doubles" value={String(aggregate.maxDoubles)} />
          <KpiCard label="Max triples" value={String(aggregate.maxTriples)} />
          <KpiCard label="Fewest misses" value={String(aggregate.fewestMisses)} />
          <KpiCard
            label="Fewest darts"
            value={aggregate.fewestDarts !== null ? String(aggregate.fewestDarts) : '—'}
          />
        </KpiGrid>
      </StatsSection>
    </div>
  );
}
