import type { GameEvent, Session } from '@/domain/types';
import { parseCheckoutConfig } from '@/games/checkout/config';
import { buildCheckoutState } from '@/games/checkout/replay';

// Checkout Practice is about nailing specific finishes, so the stats are
// per-finish accuracy aggregated across sessions, not session-level summaries.

export type CheckoutFinishTally = { attempts: number; successes: number };

export type CheckoutSessionData = {
  sessionId: string;
  startedAt: string;
  totalAttempts: number;
  totalSuccesses: number;
  perFinish: Record<number, CheckoutFinishTally>;
};

export function computeCheckoutDetail(
  events: GameEvent[],
  session: Session
): CheckoutSessionData | null {
  let config;
  try {
    config = parseCheckoutConfig(session.gameConfig);
  } catch {
    return null;
  }

  const state = buildCheckoutState(events, config, session.participants, session.id);
  const perFinish: Record<number, CheckoutFinishTally> = {};
  let totalAttempts = 0;
  let totalSuccesses = 0;

  for (const attempt of state.attempts) {
    const tally = (perFinish[attempt.targetFinish] ??= { attempts: 0, successes: 0 });
    tally.attempts++;
    totalAttempts++;
    if (attempt.success) {
      tally.successes++;
      totalSuccesses++;
    }
  }

  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    totalAttempts,
    totalSuccesses,
    perFinish
  };
}

// ── Aggregation ────────────────────────────────────────────────────────────────

export type CheckoutFinishStat = {
  finish: number;
  attempts: number;
  successes: number;
  rate: number | null;
};

export type CheckoutAggregate = {
  totalSessions: number;
  totalAttempts: number;
  totalSuccesses: number;
  successRate: number | null;
  byFinish: CheckoutFinishStat[];
};

export function aggregateCheckoutDetail(sessions: CheckoutSessionData[]): CheckoutAggregate | null {
  const played = sessions.filter((s) => s.totalAttempts > 0);
  if (played.length === 0) return null;

  const merged = new Map<number, CheckoutFinishTally>();
  let totalAttempts = 0;
  let totalSuccesses = 0;

  for (const s of played) {
    totalAttempts += s.totalAttempts;
    totalSuccesses += s.totalSuccesses;
    for (const [finish, t] of Object.entries(s.perFinish)) {
      const key = Number(finish);
      const agg = merged.get(key) ?? { attempts: 0, successes: 0 };
      agg.attempts += t.attempts;
      agg.successes += t.successes;
      merged.set(key, agg);
    }
  }

  const byFinish: CheckoutFinishStat[] = [...merged.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([finish, t]) => ({
      finish,
      attempts: t.attempts,
      successes: t.successes,
      rate: t.attempts > 0 ? t.successes / t.attempts : null
    }));

  return {
    totalSessions: played.length,
    totalAttempts,
    totalSuccesses,
    successRate: totalAttempts > 0 ? totalSuccesses / totalAttempts : null,
    byFinish
  };
}
