export type CricketSessionStats = {
  marksPerRound: number;
  totalMarks: number;
  dartsThrown: number;
  totalScored: number;
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
