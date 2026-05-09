import { StatCard, StatsGrid } from '../shared/StatsGrid';
import { formatPct } from '../shared/format';
import type { GameEvent, Session } from '@/domain/types';
import { parseCheckoutConfig } from '@/games/checkout/config';
import { buildCheckoutState } from '@/games/checkout/replay';
import { computeCheckoutStats } from '@/stats/checkoutStats';

type Props = {
  session: Session;
  events: GameEvent[];
};

export function CheckoutStatsPanel({ session, events }: Props) {
  const config = parseCheckoutConfig(session.gameConfig);
  const stats = computeCheckoutStats(events, config, session);
  const state = buildCheckoutState(events, config, session.participants, session.id);

  // First-attempt success rate: of finishes that got at least one attempt,
  // how many succeeded on attempt 0?
  const firstAttempts = state.attempts.filter((a) => a.attemptIndex === 0);
  const firstAttemptSuccesses = firstAttempts.filter((a) => a.success).length;
  const firstAttemptPct =
    firstAttempts.length > 0 ? (firstAttemptSuccesses / firstAttempts.length) * 100 : null;

  return (
    <StatsGrid testId="checkout-stats">
      <StatCard label="Success %" value={formatPct(stats.successRate)} />
      <StatCard
        label="Successes"
        value={`${stats.successCount} / ${stats.totalAttempts}`}
      />
      <StatCard
        label="Avg darts on success"
        value={stats.avgDartsOnSuccess !== null ? stats.avgDartsOnSuccess.toFixed(2) : '—'}
      />
      <StatCard
        label="Hardest finish hit"
        value={stats.hardestFinishHit !== null ? stats.hardestFinishHit : '—'}
      />
      <StatCard label="First-attempt %" value={formatPct(firstAttemptPct)} />
    </StatsGrid>
  );
}
