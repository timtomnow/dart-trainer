import type { ThrowSegment } from '@/domain/types';

export type AiDifficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type DartHit = { segment: ThrowSegment; value: number };

// Dartboard clockwise number sequence
const BOARD = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// First-dart target for checkout finishes 2–60.
// Beyond 60 we use T20 heuristics inline in selectTarget.
const CHECKOUT_TARGETS: ReadonlyMap<number, DartHit> = buildCheckoutTargets();

function buildCheckoutTargets(): ReadonlyMap<number, DartHit> {
  const m = new Map<number, DartHit>();

  // Direct 1-dart doubles: 2, 4, … 40
  for (let n = 1; n <= 20; n++) {
    m.set(n * 2, { segment: 'D', value: n * 2 });
  }
  // Bull
  m.set(50, { segment: 'DB', value: 50 });

  // Odd 41–59: S(r-40) leaves D20
  for (let r = 41; r <= 59; r += 2) {
    m.set(r, { segment: 'S', value: r - 40 });
  }

  // Even 52–60: triple to leave a clean double
  // T12 (36) → 52-36=16 → D8
  m.set(52, { segment: 'T', value: 36 });
  // T14 (42) → 54-42=12 → D6
  m.set(54, { segment: 'T', value: 42 });
  // T16 (48) → 56-48=8 → D4
  m.set(56, { segment: 'T', value: 48 });
  // T18 (54) → 58-54=4 → D2
  m.set(58, { segment: 'T', value: 54 });
  // S20 (20) → 60-20=40 → D20
  m.set(60, { segment: 'S', value: 20 });

  return m;
}

// Per-difficulty hit / near-miss probability (index = difficulty level 1–10)
const HIT_CHANCE  = [0, 0.15, 0.22, 0.30, 0.38, 0.46, 0.54, 0.62, 0.72, 0.84, 0.95] as const;
const NEAR_CHANCE = [0, 0.25, 0.28, 0.30, 0.32, 0.34, 0.31, 0.28, 0.23, 0.13, 0.04] as const;
// far-miss chance = 1 - hit - near

// Checkout awareness range per difficulty level.
// A computer at level N aims for a checkout path when remaining <= this value.
const CHECKOUT_RANGE = [0, 0, 40, 60, 80, 100, 120, 170, 170, 170, 170] as const;

// All valid dart outcomes used for far-miss sampling
const ALL_DARTS: DartHit[] = [
  { segment: 'MISS', value: 0 },
  { segment: 'SB',   value: 25 },
  { segment: 'DB',   value: 50 },
  ...BOARD.flatMap((n) => [
    { segment: 'S' as ThrowSegment, value: n },
    { segment: 'D' as ThrowSegment, value: n * 2 },
    { segment: 'T' as ThrowSegment, value: n * 3 },
  ]),
];

// ── Seeded PRNG ───────────────────────────────────────────────────────────────

// Mulberry32: fast, small, good distribution. Returns values in [0, 1).
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a fresh PRNG for a specific throw in the session.
 * Each throw index gets an independent seed so that earlier results
 * don't influence later ones and replay is deterministic.
 */
export function makeThrowRng(seed: number, throwIndex: number): () => number {
  return mulberry32((seed ^ throwIndex) >>> 0);
}

// ── Target selection ──────────────────────────────────────────────────────────

function selectTarget(remaining: number, difficulty: AiDifficulty): DartHit {
  // Level 1 always aims at single 20 — simple, no strategy
  if (difficulty === 1) return { segment: 'S', value: 20 };

  const range = CHECKOUT_RANGE[difficulty];

  if (remaining <= range) {
    // Direct checkout target from the table
    const direct = CHECKOUT_TARGETS.get(remaining);
    if (direct) return direct;

    // For remaining 61–170: try T20, else T19 to leave a clean double
    if (remaining > 60) {
      const afterT20 = remaining - 60;
      if (afterT20 >= 2 && afterT20 <= 40 && afterT20 % 2 === 0) {
        return { segment: 'T', value: 60 };
      }
      const afterT19 = remaining - 57;
      if (afterT19 >= 2 && afterT19 <= 40 && afterT19 % 2 === 0) {
        return { segment: 'T', value: 57 };
      }
    }
  }

  // Default: aim at T20
  return { segment: 'T', value: 60 };
}

// ── Miss simulation ───────────────────────────────────────────────────────────

function nearMissOf(target: DartHit, rng: () => number): DartHit {
  // Aiming at double bull: near miss is single bull
  if (target.segment === 'DB') return { segment: 'SB', value: 25 };
  // Aiming at single bull: near miss is a random adjacent sector
  if (target.segment === 'SB') {
    return { segment: 'S', value: BOARD[Math.floor(rng() * 20)]! };
  }

  const num =
    target.segment === 'T' ? target.value / 3 :
    target.segment === 'D' ? target.value / 2 :
    target.value;

  const boardIdx = BOARD.indexOf(num);
  const roll = rng();

  if (roll < 0.4) {
    // Adjacent number on the board, same ring
    const adjIdx = rng() < 0.5 ? (boardIdx + 1) % 20 : (boardIdx + 19) % 20;
    const adj = BOARD[adjIdx]!;
    const mult = target.segment === 'T' ? 3 : target.segment === 'D' ? 2 : 1;
    return { segment: target.segment, value: adj * mult };
  }

  // Same number, different ring
  if (target.segment === 'T') {
    return rng() < 0.5
      ? { segment: 'S', value: num }
      : { segment: 'D', value: num * 2 };
  }
  if (target.segment === 'D') {
    return rng() < 0.5
      ? { segment: 'S', value: num }
      : { segment: 'T', value: num * 3 };
  }
  // Single: miss to double or triple
  return rng() < 0.5
    ? { segment: 'D', value: num * 2 }
    : { segment: 'T', value: num * 3 };
}

function farMiss(rng: () => number): DartHit {
  return ALL_DARTS[Math.floor(rng() * ALL_DARTS.length)]!;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Determines what segment a computer player throws given:
 *   remaining  – current remaining score for this participant
 *   difficulty – 1 (easiest) to 10 (hardest)
 *   rng        – seeded random function (call makeThrowRng to get one)
 *
 * Pure function — no I/O, no randomness beyond what rng provides.
 */
export function computerThrow(
  remaining: number,
  difficulty: AiDifficulty,
  rng: () => number
): DartHit {
  const target = selectTarget(remaining, difficulty);
  const hitChance  = HIT_CHANCE[difficulty]!;
  const nearChance = NEAR_CHANCE[difficulty]!;
  const roll = rng();

  if (roll < hitChance) return target;
  if (roll < hitChance + nearChance) return nearMissOf(target, rng);
  return farMiss(rng);
}
