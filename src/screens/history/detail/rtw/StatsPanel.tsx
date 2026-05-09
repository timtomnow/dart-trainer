import { StatCard, StatsGrid } from '../shared/StatsGrid';
import { formatPct } from '../shared/format';
import type { GameEvent, Session } from '@/domain/types';
import { parseRtwConfig } from '@/games/rtw/config';
import { buildRtwState } from '@/games/rtw/replay';

type Props = {
  session: Session;
  events: GameEvent[];
  participantId: string;
};

function targetLabel(value: number): string {
  return value === 25 ? 'Bull' : String(value);
}

export function RtwStatsPanel({ session, events, participantId }: Props) {
  const config = parseRtwConfig(session.gameConfig);
  const state = buildRtwState(events, config, session.participants, session.id);

  const myTurns = state.turns.filter((t) => t.participantId === participantId);
  const totalDarts = myTurns.reduce((s, t) => s + t.dartsInTurn, 0);
  const totalHits = myTurns.reduce((s, t) => s + t.hitsInTurn, 0);
  const hitRate = totalDarts > 0 ? (totalHits / totalDarts) * 100 : null;

  const targetsCleared = state.participantTargetIndices[participantId] ?? 0;
  const targetsTotal = state.targetSequence.length;
  const avgDartsPerTarget = targetsCleared > 0 ? totalDarts / targetsCleared : null;

  const perTargetTotals = state.targetSequence.map((targetValue, targetIndex) => {
    const turns = myTurns.filter((t) => t.targetIndexAtStart === targetIndex);
    const darts = turns.reduce((s, t) => s + t.dartsInTurn, 0);
    const hits = turns.reduce((s, t) => s + t.hitsInTurn, 0);
    return { targetValue, targetIndex, darts, hits };
  });

  const attempted = perTargetTotals.filter((r) => r.darts > 0);

  let hardest: { targetValue: number; darts: number } | null = null;
  let easiest: { targetValue: number; darts: number } | null = null;
  for (const r of attempted) {
    if (hardest === null || r.darts > hardest.darts) hardest = { targetValue: r.targetValue, darts: r.darts };
    if (easiest === null || r.darts < easiest.darts) easiest = { targetValue: r.targetValue, darts: r.darts };
  }

  return (
    <StatsGrid testId={`rtw-stats-${participantId}`}>
      <StatCard label="Targets cleared" value={`${targetsCleared} / ${targetsTotal}`} />
      <StatCard label="Hit rate" value={formatPct(hitRate)} />
      <StatCard label="Total darts" value={totalDarts} />
      <StatCard
        label="Avg darts / target"
        value={avgDartsPerTarget !== null ? avgDartsPerTarget.toFixed(2) : '—'}
      />
      <StatCard
        label="Hardest target"
        value={hardest !== null ? `${targetLabel(hardest.targetValue)} (${hardest.darts}d)` : '—'}
      />
      <StatCard
        label="Easiest target"
        value={easiest !== null ? `${targetLabel(easiest.targetValue)} (${easiest.darts}d)` : '—'}
      />
    </StatsGrid>
  );
}
