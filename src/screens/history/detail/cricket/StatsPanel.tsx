import { StatCard, StatsGrid } from '../shared/StatsGrid';
import type { GameEvent, Session } from '@/domain/types';
import { parseCricketConfig } from '@/games/cricket/config';
import { buildCricketState } from '@/games/cricket/replay';
import { CRICKET_TARGETS, type CricketTarget } from '@/games/cricket/types';

type Props = {
  session: Session;
  events: GameEvent[];
  participantId: string;
};

const TARGET_LABEL: Record<CricketTarget, string> = {
  15: '15',
  16: '16',
  17: '17',
  18: '18',
  19: '19',
  20: '20',
  25: 'Bull'
};

export function CricketStatsPanel({ session, events, participantId }: Props) {
  const config = parseCricketConfig(session.gameConfig);
  const state = buildCricketState(events, config, session.participants, session.id);

  const closedTurns = state.legs
    .flatMap((leg) => leg.turns)
    .filter((t) => t.participantId === participantId && t.closed);

  const totalMarks = closedTurns.reduce((s, t) => s + t.marked, 0);
  const totalPoints = closedTurns.reduce((s, t) => s + t.scored, 0);
  const dartsThrown = closedTurns.reduce((s, t) => s + t.darts.length, 0);
  const rounds = closedTurns.length;
  const marksPerRound = rounds > 0 ? totalMarks / rounds : 0;

  // Per-target marks placed (across all legs).
  const allDarts = closedTurns.flatMap((t) => t.darts);
  const targetMarks: Record<CricketTarget, number> = {
    15: 0,
    16: 0,
    17: 0,
    18: 0,
    19: 0,
    20: 0,
    25: 0
  };
  for (const dart of allDarts) {
    if (dart.target !== null) targetMarks[dart.target] += dart.marksAwarded;
  }

  let bestTarget: CricketTarget | null = null;
  let worstTarget: CricketTarget | null = null;
  let bestMarks = -1;
  let worstMarks = Infinity;
  for (const t of CRICKET_TARGETS) {
    const m = targetMarks[t];
    if (m > bestMarks) {
      bestMarks = m;
      bestTarget = t;
    }
    if (m < worstMarks) {
      worstMarks = m;
      worstTarget = t;
    }
  }
  if (totalMarks === 0) {
    bestTarget = null;
    worstTarget = null;
  }

  const allClosedLegs = state.legs.filter((leg) =>
    CRICKET_TARGETS.every((t) => (leg.marks[participantId]?.[t] ?? 0) >= 3)
  ).length;

  return (
    <StatsGrid testId={`cricket-stats-${participantId}`}>
      <StatCard label="Marks per round" value={marksPerRound.toFixed(2)} />
      <StatCard label="Total marks" value={totalMarks} />
      <StatCard label="Total points" value={totalPoints} />
      <StatCard label="Rounds" value={rounds} />
      <StatCard label="Darts thrown" value={dartsThrown} />
      <StatCard
        label="Best target"
        value={bestTarget !== null ? `${TARGET_LABEL[bestTarget]} (${bestMarks})` : '—'}
      />
      <StatCard
        label="Worst target"
        value={worstTarget !== null ? `${TARGET_LABEL[worstTarget]} (${worstMarks})` : '—'}
      />
      <StatCard label="All-7 closes" value={allClosedLegs} />
    </StatsGrid>
  );
}
