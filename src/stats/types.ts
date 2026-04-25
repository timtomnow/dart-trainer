export type RtwSessionStats = {
  targetsHit: number;
  targetsTotal: number;
  dartsThrown: number;
  hitRatePct: number | null;
  durationMs: number;
};

export type RtwScoringSessionStats = {
  targetsHit: number;
  targetsTotal: number;
  dartsThrown: number;
  totalScore: number;
  durationMs: number;
};

export type CricketSessionStats = {
  marksPerRound: number;
  totalMarks: number;
  dartsThrown: number;
  totalScored: number;
  durationMs: number;
};

export type CheckoutPerFinishStats = {
  finish: number;
  attempts: number;
  successes: number;
  successRate: number | null;
  bestDarts: number | null;
};

export type CheckoutSessionStats = {
  successRate: number | null;
  successCount: number;
  totalAttempts: number;
  perFinish: CheckoutPerFinishStats[];
  dartsTaken: number[];
  avgDartsOnSuccess: number | null;
  hardestFinishHit: number | null;
  durationMs: number;
};

export type X01SessionStats = {
  threeDartAvg: number;
  firstNineAvg: number | null;
  checkoutPct: number | null;
  dartsThrown: number;
  count180: number;
  count171plus: number;
  count160plus: number;
  count140plus: number;
  count120plus: number;
  count100plus: number;
  count80plus: number;
  count60plus: number;
  highestTurnScore: number;
  highestCheckout: number;
  shortestLeg: number | null;
  busts: number;
  durationMs: number;
};
