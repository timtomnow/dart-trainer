import type { GameEvent, Session } from '@/domain/types';
import { parseX01Config, type X01InRule, type X01OutRule, type X01StartScore } from '@/games/x01/config';
import { buildX01State } from '@/games/x01/replay';
import { X01VCConfig } from '@/games/x01vc';

// ── Per-session, per-leg, per-participant shape (cached via computeOne) ─────────

export type X01LegParticipant = {
  dartsThrown: number;
  scored: number;
  won: boolean;
  /** scored per closed turn, in order (busts contribute 0) */
  turnScores: number[];
  /** remaining after each closed turn, in order */
  turnRemainingAfter: number[];
  firstNineScored: number;
  firstNineDarts: number;
  checkoutOpportunities: number;
  checkoutHits: number;
  /** startRemaining of the winning checkout turn, else 0 */
  winningCheckout: number;
  bustCount: number;
};

export type X01LegRecord = {
  legIndex: number;
  startedAt: string;
  endedAt?: string;
  winnerParticipantId?: string;
  perParticipant: Record<string, X01LegParticipant>;
};

export type X01SessionLegs = {
  sessionId: string;
  startScore: X01StartScore;
  inRule: X01InRule;
  outRule: X01OutRule;
  forfeited: boolean;
  computerParticipantId?: string;
  computerDifficulty?: number;
  legs: X01LegRecord[];
};

const FIRST_TURNS = 3;

function emptyParticipant(): X01LegParticipant {
  return {
    dartsThrown: 0,
    scored: 0,
    won: false,
    turnScores: [],
    turnRemainingAfter: [],
    firstNineScored: 0,
    firstNineDarts: 0,
    checkoutOpportunities: 0,
    checkoutHits: 0,
    winningCheckout: 0,
    bustCount: 0
  };
}

export function computeX01SessionLegs(
  events: GameEvent[],
  session: Session,
  gameModeId: 'x01' | 'x01vc'
): X01SessionLegs | null {
  let baseConfig;
  try {
    baseConfig = parseX01Config(session.gameConfig);
  } catch {
    return null;
  }

  let computerParticipantId: string | undefined;
  let computerDifficulty: number | undefined;
  if (gameModeId === 'x01vc') {
    const vc = X01VCConfig.safeParse(session.gameConfig);
    if (vc.success) {
      computerParticipantId = vc.data.computerParticipantId;
      computerDifficulty = vc.data.computerDifficulty;
    }
  }

  const state = buildX01State(events, baseConfig, session.participants, session.id);

  const legs: X01LegRecord[] = state.legs.map((leg) => {
    const perParticipant: Record<string, X01LegParticipant> = {};

    for (const turn of leg.turns) {
      if (!turn.closed) continue;
      const p = (perParticipant[turn.participantId] ??= emptyParticipant());

      const darts = turn.darts.length;
      p.dartsThrown += darts;

      if (turn.bust) {
        p.bustCount++;
        p.turnScores.push(0);
      } else {
        p.scored += turn.scored;
        p.turnScores.push(turn.scored);
      }
      // Per-turn remaining; leg.remaining holds only the final snapshot, so derive it.
      p.turnRemainingAfter.push(turn.bust ? turn.startRemaining : turn.startRemaining - turn.scored);

      if (p.turnScores.length <= FIRST_TURNS) {
        p.firstNineDarts += darts;
        p.firstNineScored += turn.bust ? 0 : turn.scored;
      }

      if (turn.startRemaining <= 170) {
        p.checkoutOpportunities++;
        if (turn.checkout) p.checkoutHits++;
      }
      if (turn.checkout && turn.startRemaining > p.winningCheckout) {
        p.winningCheckout = turn.startRemaining;
      }
    }

    if (leg.winnerParticipantId) {
      (perParticipant[leg.winnerParticipantId] ??= emptyParticipant()).won = true;
    }

    return {
      legIndex: leg.index,
      startedAt: leg.startedAt,
      endedAt: leg.endedAt,
      winnerParticipantId: leg.winnerParticipantId,
      perParticipant
    };
  });

  return {
    sessionId: session.id,
    startScore: baseConfig.startScore,
    inRule: baseConfig.inRule,
    outRule: baseConfig.outRule,
    forfeited: session.status === 'forfeited',
    computerParticipantId,
    computerDifficulty,
    legs
  };
}

// ── Config sub-filter + available options ──────────────────────────────────────

export type X01ConfigFilter = {
  startScore?: X01StartScore;
  inRule?: X01InRule;
  outRule?: X01OutRule;
  difficulty?: number;
};

export type X01AvailableConfigs = {
  startScores: X01StartScore[];
  inRules: X01InRule[];
  outRules: X01OutRule[];
  difficulties: number[];
};

export function deriveAvailableConfigs(sessions: X01SessionLegs[]): X01AvailableConfigs {
  const startScores = new Set<X01StartScore>();
  const inRules = new Set<X01InRule>();
  const outRules = new Set<X01OutRule>();
  const difficulties = new Set<number>();
  for (const s of sessions) {
    startScores.add(s.startScore);
    inRules.add(s.inRule);
    outRules.add(s.outRule);
    if (s.computerDifficulty !== undefined) difficulties.add(s.computerDifficulty);
  }
  return {
    startScores: [...startScores].sort((a, b) => a - b),
    inRules: [...inRules].sort(),
    outRules: [...outRules].sort(),
    difficulties: [...difficulties].sort((a, b) => a - b)
  };
}

function matchesConfig(s: X01SessionLegs, f: X01ConfigFilter): boolean {
  if (f.startScore !== undefined && s.startScore !== f.startScore) return false;
  if (f.inRule !== undefined && s.inRule !== f.inRule) return false;
  if (f.outRule !== undefined && s.outRule !== f.outRule) return false;
  if (f.difficulty !== undefined && s.computerDifficulty !== f.difficulty) return false;
  return true;
}

// ── Leg-level aggregation, scoped to one participant ───────────────────────────

export type BestLeg = { sessionId: string; date: string; darts: number };
export type TurnsToWinBucket = { turns: number; count: number };
export type RemainingByVisit = { visit: number; avgRemaining: number; legCount: number };

export type X01LegAggregate = {
  legsStarted: number;
  legsWonCheckout: number;
  legsLost: number;
  legsLostToComputer: number;
  legsForfeited: number;
  totalDarts: number;
  threeDartAvg: number;
  firstNineAvg: number | null;
  restAvg: number | null;
  checkoutPct: number | null;
  highestCheckout: number;
  bestLegs: BestLeg[];
  turnsToWinDistribution: TurnsToWinBucket[];
  avgRemainingByVisit: RemainingByVisit[];
  isVsComputer: boolean;
};

const BEST_LEGS_LIMIT = 5;
const MAX_VISITS_TRACKED = 8;

export function aggregateX01Legs(
  sessions: X01SessionLegs[],
  participantId: string,
  configFilter: X01ConfigFilter = {}
): X01LegAggregate | null {
  const matched = sessions.filter((s) => matchesConfig(s, configFilter));
  const isVsComputer = matched.some((s) => s.computerParticipantId !== undefined);

  let legsStarted = 0;
  let legsWonCheckout = 0;
  let legsLost = 0;
  let legsLostToComputer = 0;
  let legsForfeited = 0;
  let totalDarts = 0;
  let totalScored = 0;
  let firstNineScored = 0;
  let firstNineDarts = 0;
  let restScored = 0;
  let restDarts = 0;
  let checkoutOpportunities = 0;
  let checkoutHits = 0;
  let highestCheckout = 0;

  const bestLegs: BestLeg[] = [];
  const turnsToWin = new Map<number, number>();
  const visitSum: number[] = [];
  const visitCount: number[] = [];

  for (const s of matched) {
    for (const leg of s.legs) {
      const p = leg.perParticipant[participantId];
      if (!p) {
        // Player took no closed turns in this leg (e.g. forfeited before throwing).
        legsStarted++;
        if (leg.winnerParticipantId === undefined && s.forfeited) legsForfeited++;
        else if (leg.winnerParticipantId && leg.winnerParticipantId !== participantId) {
          legsLost++;
          if (leg.winnerParticipantId === s.computerParticipantId) legsLostToComputer++;
        }
        continue;
      }

      legsStarted++;
      totalDarts += p.dartsThrown;
      totalScored += p.scored;
      firstNineScored += p.firstNineScored;
      firstNineDarts += p.firstNineDarts;
      restScored += p.scored - p.firstNineScored;
      restDarts += p.dartsThrown - p.firstNineDarts;
      checkoutOpportunities += p.checkoutOpportunities;
      checkoutHits += p.checkoutHits;
      if (p.winningCheckout > highestCheckout) highestCheckout = p.winningCheckout;

      for (let v = 0; v < p.turnRemainingAfter.length && v < MAX_VISITS_TRACKED; v++) {
        visitSum[v] = (visitSum[v] ?? 0) + p.turnRemainingAfter[v]!;
        visitCount[v] = (visitCount[v] ?? 0) + 1;
      }

      if (leg.winnerParticipantId === participantId) {
        legsWonCheckout++;
        bestLegs.push({ sessionId: s.sessionId, date: leg.endedAt ?? leg.startedAt, darts: p.dartsThrown });
        const turns = p.turnScores.length;
        turnsToWin.set(turns, (turnsToWin.get(turns) ?? 0) + 1);
      } else if (leg.winnerParticipantId === undefined && s.forfeited) {
        legsForfeited++;
      } else if (leg.winnerParticipantId) {
        legsLost++;
        if (leg.winnerParticipantId === s.computerParticipantId) legsLostToComputer++;
      }
    }
  }

  if (legsStarted === 0) return null;

  bestLegs.sort((a, b) => a.darts - b.darts || a.date.localeCompare(b.date));

  return {
    legsStarted,
    legsWonCheckout,
    legsLost,
    legsLostToComputer,
    legsForfeited,
    totalDarts,
    threeDartAvg: totalDarts > 0 ? (totalScored / totalDarts) * 3 : 0,
    firstNineAvg: firstNineDarts > 0 ? (firstNineScored / firstNineDarts) * 3 : null,
    restAvg: restDarts > 0 ? (restScored / restDarts) * 3 : null,
    checkoutPct: checkoutOpportunities > 0 ? checkoutHits / checkoutOpportunities : null,
    highestCheckout,
    bestLegs: bestLegs.slice(0, BEST_LEGS_LIMIT),
    turnsToWinDistribution: [...turnsToWin.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([turns, count]) => ({ turns, count })),
    avgRemainingByVisit: visitSum.map((sum, i) => ({
      visit: i + 1,
      avgRemaining: sum / visitCount[i]!,
      legCount: visitCount[i]!
    })),
    isVsComputer
  };
}
