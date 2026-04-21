import type { ThrowSegment } from '@/domain/types';
import type { RtwScoringConfig, RtwScoringGameType, RtwScoringMode } from './config';

const DARTBOARD_CLOCKWISE = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;
const SEQUENCE_1_20 = Array.from({ length: 20 }, (_, i) => i + 1);

export function getTargetSequence(config: RtwScoringConfig): number[] {
  let base: number[];

  if (config.order === 'Random' && config.customSequence && config.customSequence.length > 0) {
    base = config.customSequence.slice();
  } else {
    switch (config.order) {
      case '1-20':              base = SEQUENCE_1_20.slice(); break;
      case '20-1':              base = [...SEQUENCE_1_20].reverse(); break;
      case 'Clockwise':         base = [...DARTBOARD_CLOCKWISE]; break;
      case 'Counter Clockwise': base = [...DARTBOARD_CLOCKWISE].reverse(); break;
      case 'Random':            base = SEQUENCE_1_20.slice(); break;
    }
  }

  if (!config.excludeBull && config.gameType !== 'Triple') {
    base = [...base, 25];
  }

  return base;
}

export function isHit(
  segment: ThrowSegment,
  value: number,
  target: number,
  gameType: RtwScoringGameType
): boolean {
  if (target === 25) {
    switch (gameType) {
      case 'Single':
      case 'Single Outer': return segment === 'SB' || segment === 'DB';
      case 'Single Inner': return segment === 'SB';
      case 'Double':       return segment === 'DB';
      case 'Triple':       return false;
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

// Points scored by landing on the target sector in any ring
export function dartScore(segment: ThrowSegment, value: number, target: number): number {
  if (target === 25) {
    if (segment === 'SB') return 25;
    if (segment === 'DB') return 50;
    return 0;
  }
  if (segment === 'S' && value === target)     return target;
  if (segment === 'D' && value === target * 2) return target * 2;
  if (segment === 'T' && value === target * 3) return target * 3;
  return 0;
}

export function dartsPerTurn(mode: RtwScoringMode): number {
  return mode === '1-dart per target' ? 1 : 3;
}

export function advancesOnHit(mode: RtwScoringMode): boolean {
  return mode === 'Hit once';
}

export function alwaysAdvances(mode: RtwScoringMode): boolean {
  return mode === '3 darts per target' || mode === '1-dart per target';
}

export function hitsRequiredToAdvance(mode: RtwScoringMode): number {
  switch (mode) {
    case '3-darts until hit 1': return 1;
    case '3-darts until hit 2': return 2;
    case '3-darts until hit 3': return 3;
    default:                    return 0;
  }
}
