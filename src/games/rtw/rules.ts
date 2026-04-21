import type { ThrowSegment } from '@/domain/types';
import type { RtwConfig, RtwGameType, RtwMode } from './config';

const DARTBOARD_CLOCKWISE = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;
const SEQUENCE_1_20 = Array.from({ length: 20 }, (_, i) => i + 1);

export function getTargetSequence(config: RtwConfig): number[] {
  let base: number[];

  if (config.order === 'Random' && config.customSequence && config.customSequence.length > 0) {
    base = config.customSequence.slice();
  } else {
    switch (config.order) {
      case '1-20':              base = SEQUENCE_1_20.slice(); break;
      case '20-1':              base = [...SEQUENCE_1_20].reverse(); break;
      case 'Clockwise':         base = [...DARTBOARD_CLOCKWISE]; break;
      case 'Counter Clockwise': base = [...DARTBOARD_CLOCKWISE].reverse(); break;
      case 'Random':            base = SEQUENCE_1_20.slice(); break; // fallback without seed
    }
  }

  if (!config.excludeBull && config.gameType !== 'Triple') {
    base = [...base, 25];
  }

  return base;
}

// Fisher-Yates shuffle with a simple LCG seeded from a string (for pre-computing random sequences in the UI layer)
export function seededShuffle(seq: number[], seed: string): number[] {
  const arr = seq.slice();
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function isHit(
  segment: ThrowSegment,
  value: number,
  target: number,
  gameType: RtwGameType
): boolean {
  if (target === 25) {
    switch (gameType) {
      case 'Single':
      case 'Single Outer': return segment === 'SB' || segment === 'DB';
      case 'Single Inner': return segment === 'SB'; // SB = outer bull ring (25 pts)
      case 'Double':       return segment === 'DB'; // DB = inner bull (50 pts)
      case 'Triple':       return false;            // no triple bull
    }
  }
  switch (gameType) {
    case 'Single':
    case 'Single Inner':
    case 'Single Outer': return segment === 'S' && value === target;
    case 'Double':       return segment === 'D' && value === target * 2;
    case 'Triple':       return segment === 'T' && value === target * 3;
  }
}

// Points scored when a dart lands on the target sector (any ring), used by RTW Scoring
export function dartScore(segment: ThrowSegment, value: number, target: number): number {
  if (target === 25) {
    if (segment === 'SB') return 25;
    if (segment === 'DB') return 50;
    return 0;
  }
  if (segment === 'S' && value === target)       return target;
  if (segment === 'D' && value === target * 2)   return target * 2;
  if (segment === 'T' && value === target * 3)   return target * 3;
  return 0;
}

export function dartsPerTurn(mode: RtwMode): number {
  return mode === '1-dart per target' ? 1 : 3;
}

// True when a hit should immediately advance the target mid-turn
export function advancesOnHit(mode: RtwMode): boolean {
  return mode === 'Hit once';
}

// True when the turn always advances regardless of hits
export function alwaysAdvances(mode: RtwMode): boolean {
  return mode === '3 darts per target' || mode === '1-dart per target';
}

// Minimum hits in a turn required to advance (irrelevant when alwaysAdvances or advancesOnHit)
export function hitsRequiredToAdvance(mode: RtwMode): number {
  switch (mode) {
    case '3-darts until hit 1': return 1;
    case '3-darts until hit 2': return 2;
    case '3-darts until hit 3': return 3;
    default:                    return 0;
  }
}
