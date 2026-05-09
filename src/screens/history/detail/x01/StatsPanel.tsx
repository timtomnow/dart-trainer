import { StatCard, StatsGrid } from '../shared/StatsGrid';
import { formatAvg, formatPct } from '../shared/format';
import type { GameEvent, Session } from '@/domain/types';
import { parseX01Config } from '@/games/x01/config';
import { buildX01State } from '@/games/x01/replay';
import { computeX01SessionStats } from '@/stats/x01Session';

type Props = {
  session: Session;
  events: GameEvent[];
  participantId: string;
  testId?: string;
};

type TurnDistribution = {
  c60: number;
  c80: number;
  c100: number;
  c120: number;
  c140: number;
  c160: number;
  c171: number;
  c180: number;
  highestTurnScore: number;
  bustRate: number | null;
  totalScoredTurns: number;
};

function distributionFor(
  state: ReturnType<typeof buildX01State>,
  participantId: string
): TurnDistribution {
  let c60 = 0,
    c80 = 0,
    c100 = 0,
    c120 = 0,
    c140 = 0,
    c160 = 0,
    c171 = 0,
    c180 = 0;
  let highest = 0;
  let busts = 0;
  let total = 0;

  for (const leg of state.legs) {
    for (const turn of leg.turns) {
      if (!turn.closed) continue;
      if (turn.participantId !== participantId) continue;
      total++;
      if (turn.bust) {
        busts++;
        continue;
      }
      const s = turn.scored;
      if (s > highest) highest = s;
      if (s >= 60) c60++;
      if (s >= 80) c80++;
      if (s >= 100) c100++;
      if (s >= 120) c120++;
      if (s >= 140) c140++;
      if (s >= 160) c160++;
      if (s >= 171) c171++;
      if (s === 180) c180++;
    }
  }

  return {
    c60,
    c80,
    c100,
    c120,
    c140,
    c160,
    c171,
    c180,
    highestTurnScore: highest,
    bustRate: total > 0 ? (busts / total) * 100 : null,
    totalScoredTurns: total
  };
}

export function X01StatsPanel({ session, events, participantId, testId }: Props) {
  const config = parseX01Config(session.gameConfig);
  const state = buildX01State(events, config, session.participants, session.id);
  const stats = computeX01SessionStats(state, config, participantId);
  const dist = distributionFor(state, participantId);

  return (
    <div className="space-y-3">
      <StatsGrid testId={testId ?? 'x01-session-stats'}>
        <StatCard label="3-dart avg" value={formatAvg(stats.threeDartAvg)} />
        <StatCard
          label="First-9 avg"
          value={stats.firstNineAvg !== null ? formatAvg(stats.firstNineAvg) : '—'}
        />
        <StatCard label="Checkout %" value={formatPct(stats.checkoutPct)} />
        <StatCard
          label="Highest finish"
          value={stats.highestFinish > 0 ? stats.highestFinish : '—'}
        />
        <StatCard
          label="Highest turn"
          value={dist.highestTurnScore > 0 ? dist.highestTurnScore : '—'}
        />
        <StatCard label="Darts thrown" value={stats.dartsThrown} />
        <StatCard
          label="Bust rate"
          value={dist.bustRate !== null ? formatPct(dist.bustRate) : '—'}
        />
        <StatCard label="Legs won" value={stats.legsWon} />
      </StatsGrid>

      <StatsGrid testId={`${testId ?? 'x01-session-stats'}-distribution`}>
        <StatCard label="60+" value={dist.c60} />
        <StatCard label="80+" value={dist.c80} />
        <StatCard label="100+" value={dist.c100} />
        <StatCard label="120+" value={dist.c120} />
        <StatCard label="140+" value={dist.c140} />
        <StatCard label="160+" value={dist.c160} />
        <StatCard label="171+" value={dist.c171} />
        <StatCard label="180s" value={dist.c180} />
      </StatsGrid>
    </div>
  );
}
