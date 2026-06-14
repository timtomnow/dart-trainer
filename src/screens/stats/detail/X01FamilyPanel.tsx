import { useState } from 'react';
import { X01BestLegs } from './X01BestLegs';
import { X01ConfigFilter } from './X01ConfigFilter';
import { X01TurnsToWin } from './X01Distribution';
import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import { useX01Stats } from '@/hooks/useX01Stats';
import { fmtAvg, fmtPct } from '@/stats/formatters';
import type { X01ConfigFilter as X01ConfigFilterValue } from '@/stats/x01Legs';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';
import { TrendChart } from '@/ui/stats/TrendChart';

type Props = StatsPanelProps & { gameModeId: 'x01' | 'x01vc' };

export function X01FamilyPanel({ profileId, filter, gameModeId }: Props) {
  const [config, setConfig] = useState<X01ConfigFilterValue>({});
  const { loading, available, aggregate } = useX01Stats(profileId, filter, gameModeId, config);
  const isVc = gameModeId === 'x01vc';

  if (loading) return <StatsLoading />;

  return (
    <div className="space-y-6">
      <X01ConfigFilter
        available={available}
        value={config}
        onChange={setConfig}
        showDifficulty={isVc}
      />

      {!aggregate ? (
        <StatsEmpty message="No legs in this range. Play a session, or widen the filters." />
      ) : (
        <>
          <StatsSection title="Best legs (fewest darts)">
            <X01BestLegs legs={aggregate.bestLegs} />
          </StatsSection>

          <StatsSection title="Legs">
            <KpiGrid>
              <KpiCard label="Legs played" value={String(aggregate.legsStarted)} />
              <KpiCard label="Won (checkout)" value={String(aggregate.legsWonCheckout)} />
              {isVc ? (
                <KpiCard label="Lost to computer" value={String(aggregate.legsLostToComputer)} />
              ) : (
                <KpiCard label="Lost" value={String(aggregate.legsLost)} />
              )}
              <KpiCard label="Forfeited" value={String(aggregate.legsForfeited)} />
              <KpiCard label="Total darts" value={String(aggregate.totalDarts)} />
            </KpiGrid>
          </StatsSection>

          <StatsSection title="Scoring">
            <KpiGrid>
              <KpiCard label="3-dart avg" value={fmtAvg(aggregate.threeDartAvg)} />
              <KpiCard label="First-9 avg" value={aggregate.firstNineAvg !== null ? fmtAvg(aggregate.firstNineAvg) : '—'} />
              <KpiCard label="After first-9 avg" value={aggregate.restAvg !== null ? fmtAvg(aggregate.restAvg) : '—'} />
              <KpiCard label="Checkout %" value={aggregate.checkoutPct !== null ? fmtPct(aggregate.checkoutPct) : '—'} />
              <KpiCard label="Best checkout" value={aggregate.highestCheckout > 0 ? String(aggregate.highestCheckout) : '—'} />
            </KpiGrid>
          </StatsSection>

          <StatsSection title="Visits to win a leg">
            <X01TurnsToWin buckets={aggregate.turnsToWinDistribution} />
          </StatsSection>

          <StatsSection title="Average score remaining after each visit">
            <TrendChart
              points={aggregate.avgRemainingByVisit.map((v) => ({
                sessionId: `visit-${v.visit}`,
                value: v.avgRemaining
              }))}
              ariaLabel="Average remaining score after each visit"
              emptyHint="Play more legs in this range to see the remaining-score trajectory."
              format={(n) => String(Math.round(n))}
              showPointLabels
            />
          </StatsSection>
        </>
      )}
    </div>
  );
}
