import type { RtwScoringConfig } from './config';
import type { RtwScoringMultiplier } from './types';

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

  // Bull is always included
  return [...base, 25];
}

export function dartScore(multiplier: RtwScoringMultiplier): number {
  switch (multiplier) {
    case 'miss':   return 0;
    case 'single': return 1;
    case 'double': return 2;
    case 'triple': return 3;
  }
}

export function isInvalidForTarget(multiplier: RtwScoringMultiplier, targetValue: number): boolean {
  // Triple bull does not exist on a real dartboard
  return multiplier === 'triple' && targetValue === 25;
}
