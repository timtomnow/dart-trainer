import { CRICKET_TARGETS, type CricketTarget } from './types';
import type { ThrowSegment } from '@/domain/types';

export function targetFromDart(segment: ThrowSegment, value: number): CricketTarget | null {
  if (segment === 'MISS') return null;
  if (segment === 'SB') return 25;
  if (segment === 'DB') return 25;

  const face =
    segment === 'T' ? value / 3 :
    segment === 'D' ? value / 2 :
    value; // S

  if ((CRICKET_TARGETS as readonly number[]).includes(face)) return face as CricketTarget;
  return null;
}

export function marksFromSegment(segment: ThrowSegment): number {
  switch (segment) {
    case 'T': return 3;
    case 'D': return 2;
    case 'DB': return 2;
    case 'S': return 1;
    case 'SB': return 1;
    default: return 0;
  }
}

export type MarkOutcome = {
  marksAwarded: number;
  scored: number;
};

// marksAwarded = delta on the capped [0-3] mark count
// scored = points earned from excess marks (beyond 3), only when target isn't dead
export function applyMark(args: {
  target: CricketTarget;
  prevMarks: number;
  incomingMarks: number;
  allMarks: Record<string, Record<number, number>>;
  participantId: string;
  participantIds: string[];
}): MarkOutcome {
  const { target, prevMarks, incomingMarks, allMarks, participantId, participantIds } = args;

  const newTotal = prevMarks + incomingMarks;
  const marksAwarded = Math.min(newTotal, 3) - prevMarks;
  const excessMarks = Math.max(0, newTotal - 3);

  if (excessMarks === 0) return { marksAwarded, scored: 0 };

  const allOpponentsClosed = participantIds
    .filter((p) => p !== participantId)
    .every((p) => (allMarks[p]?.[target] ?? 0) >= 3);

  if (allOpponentsClosed) return { marksAwarded, scored: 0 };

  return { marksAwarded, scored: excessMarks * target };
}

export function isWinner(
  marks: Record<number, number>,
  score: number,
  allScores: Record<string, number>,
  participantId: string
): boolean {
  const allClosed = (CRICKET_TARGETS as readonly number[]).every(
    (t) => (marks[t] ?? 0) >= 3
  );
  if (!allClosed) return false;
  return Object.entries(allScores).every(([pid, s]) => pid === participantId || s <= score);
}
