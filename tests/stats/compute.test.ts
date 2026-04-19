import { describe, expect, it } from 'vitest';
import type { GameEvent } from '@/domain/types';
import type { X01Config } from '@/games/x01/config';
import { computeSessionStats } from '@/stats/compute';

// value field in throw events is the scored amount (T20 → 60, D12 → 24, S1 → 1)

const SESSION_ID = '01J0000000000000000000001A';
const PARTICIPANT_ID = '01J0000000000000000000002A';
const BASE_TS = '2026-01-01T12:00:00.000Z';

function makeThrow(seq: number, segment: string, value: number): GameEvent {
  return {
    schemaVersion: 1,
    id: `ev-${seq}`,
    sessionId: SESSION_ID,
    seq,
    type: 'throw',
    timestamp: new Date(Date.parse(BASE_TS) + seq * 5000).toISOString(),
    payload: { participantId: PARTICIPANT_ID, segment, value }
  };
}

// ── Fixture 1: 501 straight-out, 3 perfect turns ──────────────────────────────
//
// Turn 1: T20(60) + T20(60) + T20(60)  = 180  remaining 501-180 = 321
// Turn 2: T20(60) + T20(60) + T19(57)  = 177  remaining 321-177 = 144
// Turn 3: T20(60) + T20(60) + D12(24)  = 144  remaining 144-144 = 0 → checkout
//
// Expected:
//   dartsThrown     = 9
//   totalScored     = 501  → threeDartAvg = (501/9)*3 = 167
//   firstNineAvg    = (180+177+144)/3 = 167
//   checkoutPct     = 1/1  (turn 3 startRemaining=144 ≤ 170)
//   count180        = 1
//   count171plus    = 2  (180 and 177)
//   count160plus    = 2
//   count140plus    = 3  (all three turns)
//   highestTurnScore = 180
//   highestCheckout  = 144
//   shortestLeg      = 9
//   busts            = 0

const CONFIG_501: X01Config = {
  startScore: 501,
  inRule: 'straight',
  outRule: 'straight',
  legsToWin: 1
};

const SESSION_501 = {
  id: SESSION_ID,
  participants: [PARTICIPANT_ID],
  startedAt: BASE_TS
};

const EVENTS_501: GameEvent[] = [
  makeThrow(0, 'T', 60), // T20
  makeThrow(1, 'T', 60), // T20
  makeThrow(2, 'T', 60), // T20 → turn 1 scored 180
  makeThrow(3, 'T', 60), // T20
  makeThrow(4, 'T', 60), // T20
  makeThrow(5, 'T', 57), // T19 → turn 2 scored 177
  makeThrow(6, 'T', 60), // T20
  makeThrow(7, 'T', 60), // T20
  makeThrow(8, 'D', 24)  // D12 → turn 3 scored 144 → checkout
];

describe('computeSessionStats — 501 straight-out fixture', () => {
  const stats = computeSessionStats(EVENTS_501, CONFIG_501, SESSION_501);

  it('counts darts thrown', () => expect(stats.dartsThrown).toBe(9));
  it('computes three-dart average', () => expect(stats.threeDartAvg).toBeCloseTo(167, 1));
  it('computes first-nine average', () => expect(stats.firstNineAvg).toBeCloseTo(167, 1));
  it('computes checkout pct (1/1)', () => expect(stats.checkoutPct).toBeCloseTo(1, 5));
  it('counts 180s', () => expect(stats.count180).toBe(1));
  it('counts 171+', () => expect(stats.count171plus).toBe(2));
  it('counts 160+', () => expect(stats.count160plus).toBe(2));
  it('counts 140+', () => expect(stats.count140plus).toBe(3));
  it('counts 120+', () => expect(stats.count120plus).toBe(3));
  it('counts 100+', () => expect(stats.count100plus).toBe(3));
  it('counts 80+', () => expect(stats.count80plus).toBe(3));
  it('counts 60+', () => expect(stats.count60plus).toBe(3));
  it('records highest turn score', () => expect(stats.highestTurnScore).toBe(180));
  it('records highest checkout', () => expect(stats.highestCheckout).toBe(144));
  it('records shortest leg in darts', () => expect(stats.shortestLeg).toBe(9));
  it('counts busts', () => expect(stats.busts).toBe(0));
  it('computes non-negative duration', () => expect(stats.durationMs).toBeGreaterThanOrEqual(0));
});

// ── Fixture 2: 301 straight-out with a bust ───────────────────────────────────
//
// Turn 1: T20(60) + T20(60) + T20(60)  = 180  remaining 301-180 = 121
// Turn 2: T20(60) + T17(51) + T20(60)  → after 2 darts: remaining 121-111=10;
//         third dart 60 > 10 → BUST  (remaining stays 121)
// Turn 3: T20(60) + T20(60) + S1(1)   = 121  remaining 121-121 = 0 → checkout
//
// Expected:
//   dartsThrown     = 9   (bust darts still count)
//   busts           = 1
//   totalScored     = 180 + 0 + 121 = 301 → threeDartAvg = (301/9)*3 ≈ 100.3
//   count60plus     = 2   (turn 1: 180, turn 2: 0=bust skipped, turn 3: 121)

const CONFIG_301: X01Config = {
  startScore: 301,
  inRule: 'straight',
  outRule: 'straight',
  legsToWin: 1
};

const SESSION_301 = {
  id: '01J0000000000000000000003A',
  participants: [PARTICIPANT_ID],
  startedAt: BASE_TS
};

const EVENTS_301: GameEvent[] = [
  makeThrow(0, 'T', 60), // T20
  makeThrow(1, 'T', 60), // T20
  makeThrow(2, 'T', 60), // T20 → turn 1 scored 180, remaining 121
  makeThrow(3, 'T', 60), // T20
  makeThrow(4, 'T', 51), // T17 → running 111 in turn 2, remaining now 10
  makeThrow(5, 'T', 60), // T20 → 60 > 10 → BUST
  makeThrow(6, 'T', 60), // T20
  makeThrow(7, 'T', 60), // T20 → running 120, remaining 121-120=1
  makeThrow(8, 'S', 1)   // S1  → remaining 1-1=0 → checkout
];

describe('computeSessionStats — bust handling', () => {
  const stats = computeSessionStats(EVENTS_301, CONFIG_301, SESSION_301);

  it('counts one bust', () => expect(stats.busts).toBe(1));
  it('counts 9 darts thrown including bust darts', () => expect(stats.dartsThrown).toBe(9));
  it('bust turn contributes 0 to score bands', () => expect(stats.count60plus).toBe(2));
  it('three-dart avg uses non-bust scored only', () =>
    expect(stats.threeDartAvg).toBeCloseTo((301 / 9) * 3, 1));
  it('shortest leg is 9 darts', () => expect(stats.shortestLeg).toBe(9));
});
