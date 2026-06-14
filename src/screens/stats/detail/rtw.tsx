import { useState } from 'react';
import { StatsEmpty, StatsLoading, StatsSection, type StatsPanelProps } from './shared';
import type { RtwGameType, RtwMode } from '@/games/rtw/config';
import { useRtwStats } from '@/hooks/useRtwStats';
import { fmtPct } from '@/stats/formatters';
import type { RtwConfigFilter } from '@/stats/rtwDetail';
import { KpiCard, KpiGrid } from '@/ui/stats/KpiCard';
import { RankedList } from '@/ui/stats/RankedList';
import { StatBars } from '@/ui/stats/StatBars';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function FilterSelect({
  label,
  testId,
  value,
  options,
  onChange
}: {
  label: string;
  testId: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        data-testid={testId}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Panel({ profileId, filter }: StatsPanelProps) {
  const [config, setConfig] = useState<RtwConfigFilter>({});
  const { loading, available, aggregate } = useRtwStats(profileId, filter, config);

  if (loading) return <StatsLoading />;

  const showGameType = available.gameTypes.length > 1;
  const showMode = available.modes.length > 1;

  return (
    <div className="space-y-6">
      {(showGameType || showMode) && (
        <div className="flex flex-wrap items-end gap-3">
          {showGameType && (
            <FilterSelect
              label="Game type"
              testId="rtw-filter-gametype"
              value={config.gameType ?? ''}
              options={available.gameTypes}
              onChange={(v) => setConfig({ ...config, gameType: (v || undefined) as RtwGameType | undefined })}
            />
          )}
          {showMode && (
            <FilterSelect
              label="Mode"
              testId="rtw-filter-mode"
              value={config.mode ?? ''}
              options={available.modes}
              onChange={(v) => setConfig({ ...config, mode: (v || undefined) as RtwMode | undefined })}
            />
          )}
        </div>
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
              <KpiCard label="Accuracy" value={aggregate.accuracy !== null ? fmtPct(aggregate.accuracy) : '—'} />
            </KpiGrid>
          </StatsSection>

          <StatsSection title={aggregate.topKind === 'darts' ? 'Best games (fewest darts)' : 'Best games (accuracy)'}>
            <RankedList
              emptyHint="No completed games yet."
              rows={aggregate.topGames.map((g) => ({
                id: `${g.sessionId}-${g.date}`,
                primary: g.kind === 'darts' ? `${g.darts} darts` : fmtPct(g.accuracy),
                secondary: fmtDate(g.date)
              }))}
            />
          </StatsSection>

          <StatsSection title="Per-session averages">
            <KpiGrid>
              <KpiCard label="Avg accuracy" value={aggregate.avgAccuracy !== null ? fmtPct(aggregate.avgAccuracy) : '—'} />
              <KpiCard label="Avg darts" value={aggregate.avgDarts.toFixed(1)} />
              <KpiCard label="Avg hits" value={aggregate.avgHits.toFixed(1)} />
              <KpiCard label="Avg misses" value={aggregate.avgMisses.toFixed(1)} />
              <KpiCard label="Avg targets hit" value={aggregate.avgTargetsHit.toFixed(1)} />
              {aggregate.fewestDartsApplicable && (
                <>
                  <KpiCard label="Fewest darts" value={aggregate.fewestDarts !== null ? String(aggregate.fewestDarts) : '—'} />
                  <KpiCard
                    label="Avg darts to finish"
                    value={aggregate.avgDartsToComplete !== null ? aggregate.avgDartsToComplete.toFixed(1) : '—'}
                  />
                </>
              )}
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

          <StatsSection title="Hits by number (hits / attempts)">
            <StatBars
              max={1}
              rows={aggregate.byNumber.map((b) => ({
                id: `frac-${b.target}`,
                label: b.label,
                value: b.accuracy,
                display: `${b.hits}/${b.attempts}`
              }))}
            />
          </StatsSection>
        </>
      )}
    </div>
  );
}
