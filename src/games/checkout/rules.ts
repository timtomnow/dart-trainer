import type { ThrowSegment } from '@/domain/types';
import type { CheckoutConfig, CheckoutOutRule } from './config';

export function dartScore(segment: ThrowSegment, value: number): number {
  return segment === 'MISS' ? 0 : value;
}

export function isValidFinisher(segment: ThrowSegment, outRule: CheckoutOutRule): boolean {
  if (outRule === 'double') return segment === 'D' || segment === 'DB';
  // masters: double or triple
  return segment === 'D' || segment === 'DB' || segment === 'T';
}

export function getOrderedFinishes(config: CheckoutConfig): number[] {
  if (config.mode === 'random' && config.orderedFinishes && config.orderedFinishes.length > 0) {
    return config.orderedFinishes.slice();
  }
  return config.finishes.slice();
}

// Fisher-Yates shuffle with a simple LCG seeded from a string
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
