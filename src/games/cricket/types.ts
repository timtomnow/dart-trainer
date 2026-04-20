import type { CricketConfig } from './config';
import type { GameEvent, ThrowSegment } from '@/domain/types';

export const CRICKET_TARGETS = [15, 16, 17, 18, 19, 20, 25] as const;
export type CricketTarget = (typeof CRICKET_TARGETS)[number];

export type CricketStatus = 'in_progress' | 'completed' | 'forfeited';

export type CricketDartIndex = 0 | 1 | 2;

export type CricketAction =
  | { type: 'throw'; participantId: string; segment: ThrowSegment; value: number }
  | { type: 'forfeit'; participantId: string }
  | { type: 'note'; text: string }
  | { type: 'undo' };

export type CricketDart = {
  eventId: string;
  segment: ThrowSegment;
  value: number;
  target: CricketTarget | null;
  marksAwarded: number;
  scored: number;
};

export type CricketTurn = {
  participantId: string;
  indexInLeg: number;
  startedAt: string;
  endedAt?: string;
  darts: CricketDart[];
  closed: boolean;
  marked: number;
  scored: number;
};

// marks: participantId -> target -> cumulative marks (0–3, capped)
// score: participantId -> total points
export type CricketLeg = {
  index: number;
  startedAt: string;
  endedAt?: string;
  winnerParticipantId?: string;
  turns: CricketTurn[];
  marks: Record<string, Record<number, number>>;
  score: Record<string, number>;
};

export type CricketState = {
  sessionId: string;
  participantIds: string[];
  config: CricketConfig;
  status: CricketStatus;
  inputEventLog: GameEvent[];
  legs: CricketLeg[];
  currentLegIndex: number;
  legsWon: Record<string, number>;
  activeParticipantId: string;
  winnerParticipantId?: string;
};

export type CricketThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
  dartIndex: CricketDartIndex;
  legIndex: number;
  turnIndexInLeg: number;
};

export type CricketViewModel = {
  status: CricketStatus;
  config: CricketConfig;
  legIndex: number;
  legsWon: Record<string, number>;
  activeParticipantId: string;
  participantIds: string[];
  marks: Record<string, Record<number, number>>;
  score: Record<string, number>;
  currentTurn: {
    darts: Array<{
      segment: ThrowSegment;
      value: number;
      target: CricketTarget | null;
      marksAwarded: number;
      scored: number;
    }>;
    dartIndex: CricketDartIndex;
    marked: number;
    scored: number;
  };
  lastClosedTurn: {
    participantId: string;
    marked: number;
    scored: number;
  } | null;
  canUndo: boolean;
  winnerParticipantId?: string;
};
