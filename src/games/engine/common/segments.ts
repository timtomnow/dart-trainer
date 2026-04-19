import type { ThrowSegment } from '@/domain/types';

export type DartHit = { segment: ThrowSegment; value: number };

const SINGLE_RANGE = Array.from({ length: 20 }, (_, i) => i + 1);
const DOUBLE_VALUES = new Set(SINGLE_RANGE.map((n) => n * 2));
const TRIPLE_VALUES = new Set(SINGLE_RANGE.map((n) => n * 3));

export function isValidDart(hit: DartHit): boolean {
  const { segment, value } = hit;
  if (segment === 'MISS') return value === 0;
  if (segment === 'SB') return value === 25;
  if (segment === 'DB') return value === 50;
  if (segment === 'S') return SINGLE_RANGE.includes(value);
  if (segment === 'D') return DOUBLE_VALUES.has(value);
  if (segment === 'T') return TRIPLE_VALUES.has(value);
  return false;
}

export function isDouble(segment: ThrowSegment): boolean {
  return segment === 'D' || segment === 'DB';
}

export function isTriple(segment: ThrowSegment): boolean {
  return segment === 'T';
}

export function isScoringDart(segment: ThrowSegment): boolean {
  return segment !== 'MISS';
}
