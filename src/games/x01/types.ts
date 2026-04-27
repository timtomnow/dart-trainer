import type { X01Config } from './config';
import type { GameEvent, ThrowSegment } from '@/domain/types';

export type X01DartIndex = 0 | 1 | 2;

export type X01Action =
  | {
      type: 'throw';
      participantId: string;
      segment: ThrowSegment;
      value: number;
    }
  | { type: 'forfeit'; participantId: string }
  | { type: 'note'; text: string }
  | { type: 'undo' };

export type X01Status = 'in_progress' | 'completed' | 'forfeited';

export type X01Dart = {
  eventId: string;
  segment: ThrowSegment;
  value: number;
  scored: number;
};

export type X01Turn = {
  participantId: string;
  indexInLeg: number;
  startRemaining: number;
  startedAt: string;
  endedAt?: string;
  darts: X01Dart[];
  scored: number;
  bust: boolean;
  closed: boolean;
  checkout: boolean;
};

export type X01Leg = {
  index: number;
  startedAt: string;
  endedAt?: string;
  winnerParticipantId?: string;
  turns: X01Turn[];
  remaining: Record<string, number>;
  opened: Record<string, boolean>;
};

export type X01State = {
  sessionId: string;
  participantIds: string[];
  config: X01Config;
  status: X01Status;
  inputEventLog: GameEvent[];
  legs: X01Leg[];
  currentLegIndex: number;
  legsWon: Record<string, number>;
  activeParticipantId: string;
  winnerParticipantId?: string;
};

export type X01ThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
  dartIndex: X01DartIndex;
  legIndex: number;
  turnIndexInLeg: number;
};

export type X01LegStats = {
  threeDartAvg: number;
  firstNineAvg: number | null;
  checkoutPct: number | null;
  highestFinish: number;
  dartsThrown: number;
  scoredTotal: number;
};

export type X01ViewModel = {
  status: X01Status;
  config: X01Config;
  legIndex: number;
  legsWon: Record<string, number>;
  activeParticipantId: string;
  remaining: number;
  opened: boolean;
  currentTurn: {
    darts: Array<{ segment: ThrowSegment; value: number; scored: number }>;
    scored: number;
    bust: boolean;
    dartIndex: X01DartIndex;
  };
  lastClosedTurn: {
    participantId: string;
    scored: number;
    bust: boolean;
    checkout: boolean;
  } | null;
  canUndo: boolean;
  winnerParticipantId?: string;
  legStats: X01LegStats;
  participantIds: string[];
  participantStats?: Record<string, X01LegStats>;
};
