import { StatCard, StatsGrid } from '../shared/StatsGrid';
import type { GameEvent, Session } from '@/domain/types';
import { parseRtwScoringConfig } from '@/games/rtw-scoring/config';
import { buildRtwScoringState } from '@/games/rtw-scoring/replay';

type Props = {
  session: Session;
  events: GameEvent[];
  participantId: string;
};

function targetLabel(value: number): string {
  return value === 25 ? 'Bull' : String(value);
}

// Theoretical max per target: 3 darts × 3 pts (triple) = 9, except Bull where
// triple is invalid, so 3 darts × 2 pts (double bull) = 6.
function maxScoreForTarget(targetValue: number): number {
  return targetValue === 25 ? 6 : 9;
}

export function RtwScoringStatsPanel({ session, events, participantId }: Props) {
  const config = parseRtwScoringConfig(session.gameConfig);
  const state = buildRtwScoringState(events, config, session.participants, session.id);

  const myTurns = state.turns.filter((t) => t.participantId === participantId);
  const totalScore = state.participantScores[participantId] ?? 0;

  const theoreticalMax = state.targetSequence.reduce(
    (sum, t) => sum + maxScoreForTarget(t),
    0
  );

  const targetsHit = myTurns.filter((t) => t.turnScore > 0).length;
  const targetsAttempted = myTurns.length;
  const blankTargets = myTurns.filter((t) => t.darts.length > 0 && t.turnScore === 0).length;
  const perfectTargets = myTurns.filter(
    (t) => t.turnScore === maxScoreForTarget(t.darts[0]?.targetValue ?? 0)
  ).length;

  let bestTurn: { score: number; targetValue: number } | null = null;
  let worstTurn: { score: number; targetValue: number } | null = null;
  for (const t of myTurns) {
    const tv = t.darts[0]?.targetValue;
    if (tv === undefined) continue;
    if (bestTurn === null || t.turnScore > bestTurn.score) {
      bestTurn = { score: t.turnScore, targetValue: tv };
    }
    if (worstTurn === null || t.turnScore < worstTurn.score) {
      worstTurn = { score: t.turnScore, targetValue: tv };
    }
  }

  const avgPerTarget = targetsAttempted > 0 ? totalScore / targetsAttempted : null;

  return (
    <StatsGrid testId={`rtws-stats-${participantId}`}>
      <StatCard label="Total score" value={`${totalScore} / ${theoreticalMax}`} />
      <StatCard
        label="Avg / target"
        value={avgPerTarget !== null ? avgPerTarget.toFixed(2) : '—'}
      />
      <StatCard label="Targets hit" value={`${targetsHit} / ${state.targetSequence.length}`} />
      <StatCard label="Perfect targets" value={perfectTargets} />
      <StatCard label="Blank targets" value={blankTargets} />
      <StatCard
        label="Best target"
        value={bestTurn !== null ? `${targetLabel(bestTurn.targetValue)} (${bestTurn.score})` : '—'}
      />
      <StatCard
        label="Worst target"
        value={worstTurn !== null ? `${targetLabel(worstTurn.targetValue)} (${worstTurn.score})` : '—'}
      />
    </StatsGrid>
  );
}
