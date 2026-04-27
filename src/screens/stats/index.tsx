import { Link } from 'react-router-dom';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCricketStats } from '@/hooks/useCricketStats';
import { useRtwStats } from '@/hooks/useRtwStats';
import type { RtwGroupedStats, RtwScoringGroupedStats } from '@/hooks/useRtwStats';
import { useStats } from '@/hooks/useStats';
import type { AggregateStats, TrendPoint } from '@/hooks/useStats';
import { fmtAvg, fmtPct } from '@/stats/formatters';

// ── Trend chart ───────────────────────────────────────────────────────────────

const CHART_W = 400;
const CHART_H = 100;
const PAD = 12;

function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
        Play at least 2 X01 sessions to see a trend.
      </p>
    );
  }

  const avgs = points.map((p) => p.threeDartAvg);
  const minY = Math.min(...avgs);
  const maxY = Math.max(...avgs);
  const rangeY = maxY - minY || 1;

  const innerW = CHART_W - PAD * 2;
  const innerH = CHART_H - PAD * 2;

  const toX = (i: number) => PAD + (i / (points.length - 1)) * innerW;
  const toY = (v: number) => PAD + innerH - ((v - minY) / rangeY) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.threeDartAvg).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full h-24"
      aria-label="3-dart average trend"
      role="img"
    >
      <polyline
        points={points
          .map((p, i) => `${toX(i).toFixed(1)},${toY(p.threeDartAvg).toFixed(1)}`)
          .join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-indigo-500"
      />
      {points.map((p, i) => (
        <circle
          key={p.sessionId || i}
          cx={toX(i)}
          cy={toY(p.threeDartAvg)}
          r="3"
          className="fill-indigo-500"
        />
      ))}
      {/* baseline label */}
      <text
        x={PAD}
        y={CHART_H - 2}
        fontSize="9"
        className="fill-slate-400 dark:fill-slate-500"
      >
        {fmtAvg(minY)}
      </text>
      <text
        x={PAD}
        y={PAD + 8}
        fontSize="9"
        className="fill-slate-400 dark:fill-slate-500"
      >
        {fmtAvg(maxY)}
      </text>
      {/* path for screenreaders */}
      <title>{`3-dart average from ${fmtAvg(minY)} to ${fmtAvg(maxY)}`}</title>
      <desc>{pathD}</desc>
    </svg>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function KpiGrid({ agg }: { agg: AggregateStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <KpiCard label="3-dart avg" value={fmtAvg(agg.threeDartAvg)} />
      <KpiCard
        label="First-9 avg"
        value={agg.firstNineAvg !== null ? fmtAvg(agg.firstNineAvg) : '—'}
      />
      <KpiCard
        label="Checkout %"
        value={agg.checkoutPct !== null ? fmtPct(agg.checkoutPct) : '—'}
      />
      <KpiCard label="Sessions" value={String(agg.sessionCount)} />
      <KpiCard label="180s" value={String(agg.total180s)} />
      <KpiCard
        label="Best checkout"
        value={agg.highestCheckout > 0 ? String(agg.highestCheckout) : '—'}
      />
      <KpiCard
        label="Shortest leg"
        value={agg.shortestLeg !== null ? `${agg.shortestLeg} darts` : '—'}
      />
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function StatsScreen() {
  const { settings } = useAppSettings();
  const profileId = settings?.activeProfileId ?? null;
  const { loading, aggregate, trend } = useStats(profileId);
  const { loading: cricketLoading, aggregate: cricketAggregate } = useCricketStats(profileId);
  const { loading: rtwLoading, rtwGroups, rtwScoringGroups } = useRtwStats(profileId);

  const noStats =
    !loading &&
    !cricketLoading &&
    !rtwLoading &&
    !aggregate &&
    !cricketAggregate &&
    rtwGroups.length === 0 &&
    rtwScoringGroups.length === 0;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Stats</h1>

      {!profileId && (
        <p className="text-slate-500 dark:text-slate-400">
          Create a profile to start tracking stats.
        </p>
      )}

      {profileId && loading && (
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      )}

      {profileId && noStats && (
        <div
          data-testid="stats-empty"
          className="rounded-md border border-dashed border-slate-300 p-6 text-center dark:border-slate-700"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No stats yet. Play a session.
          </p>
          <Link
            to="/play"
            className="mt-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Play a session
          </Link>
        </div>
      )}

      {aggregate && (
        <>
          <div>
            <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
              3-dart average — last {trend.length} session{trend.length !== 1 ? 's' : ''}
            </h2>
            <TrendChart points={trend} />
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
              Career X01 — last {aggregate.sessionCount} session{aggregate.sessionCount !== 1 ? 's' : ''}
            </h2>
            <KpiGrid agg={aggregate} />
          </div>
        </>
      )}

      {profileId && !cricketLoading && cricketAggregate && (
        <div>
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
            Cricket — last {cricketAggregate.sessionCount} session{cricketAggregate.sessionCount !== 1 ? 's' : ''}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard
              label="Marks per round"
              value={cricketAggregate.marksPerRound.toFixed(2)}
            />
            <KpiCard label="Total marks" value={String(cricketAggregate.totalMarks)} />
            <KpiCard label="Sessions" value={String(cricketAggregate.sessionCount)} />
          </div>
        </div>
      )}

      {profileId && !rtwLoading && rtwGroups.map(({ key, agg }: RtwGroupedStats) => (
        <div key={`${key.gameType}|${key.mode}`}>
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
            RTW — {key.gameType} / {key.mode} — last {agg.sessionCount} session{agg.sessionCount !== 1 ? 's' : ''}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard label="Avg targets hit" value={agg.avgTargetsHit.toFixed(1)} />
            <KpiCard
              label="Hit rate"
              value={agg.avgHitRatePct !== null ? fmtPct(agg.avgHitRatePct) : '—'}
            />
            <KpiCard label="Sessions" value={String(agg.sessionCount)} />
          </div>
        </div>
      ))}

      {profileId && !rtwLoading && rtwScoringGroups.map(({ key, agg }: RtwScoringGroupedStats) => (
        <div key={`scoring|${key.order}`}>
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
            RTW Scoring — {key.order} — last {agg.sessionCount} session{agg.sessionCount !== 1 ? 's' : ''}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard label="Avg points" value={agg.avgScore.toFixed(0)} />
            <KpiCard label="Best points" value={String(agg.bestScore)} />
            <KpiCard label="Sessions" value={String(agg.sessionCount)} />
          </div>
        </div>
      ))}
    </section>
  );
}
