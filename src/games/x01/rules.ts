import type { X01Config, X01OutRule } from './config';
import type { ThrowSegment } from '@/domain/types';
import { isDouble, isTriple } from '@/games/engine/common';

export type DartOutcome =
  | { kind: 'score'; nextRemaining: number; opened: boolean; scored: number }
  | { kind: 'ignored'; reason: 'not_opened' }
  | { kind: 'bust'; reason: 'below_zero' | 'leaves_one' | 'out_rule' }
  | { kind: 'checkout'; scored: number };

export function satisfiesOutRule(
  outRule: X01OutRule,
  segment: ThrowSegment
): boolean {
  if (outRule === 'straight') return true;
  if (outRule === 'double') return isDouble(segment);
  if (outRule === 'masters') return isDouble(segment) || isTriple(segment);
  return false;
}

export function applyDart(args: {
  remaining: number;
  opened: boolean;
  config: X01Config;
  segment: ThrowSegment;
  value: number;
}): DartOutcome {
  const { remaining, opened, config, segment, value } = args;

  const needsNonSingleFinish = config.outRule !== 'straight';

  if (config.inRule === 'double' && !opened) {
    if (!isDouble(segment)) {
      return { kind: 'ignored', reason: 'not_opened' };
    }
    const tentative = remaining - value;
    if (tentative < 0) return { kind: 'bust', reason: 'below_zero' };
    if (tentative === 1 && needsNonSingleFinish) {
      return { kind: 'bust', reason: 'leaves_one' };
    }
    if (tentative === 0) {
      if (satisfiesOutRule(config.outRule, segment)) {
        return { kind: 'checkout', scored: value };
      }
      return { kind: 'bust', reason: 'out_rule' };
    }
    return { kind: 'score', nextRemaining: tentative, opened: true, scored: value };
  }

  const tentative = remaining - value;
  if (tentative < 0) return { kind: 'bust', reason: 'below_zero' };
  if (tentative === 1 && needsNonSingleFinish) {
    return { kind: 'bust', reason: 'leaves_one' };
  }
  if (tentative === 0) {
    if (satisfiesOutRule(config.outRule, segment)) {
      return { kind: 'checkout', scored: value };
    }
    return { kind: 'bust', reason: 'out_rule' };
  }
  return { kind: 'score', nextRemaining: tentative, opened, scored: value };
}
