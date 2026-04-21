import type { RtwConfig } from './config';
import type { GameEvent, ThrowSegment } from '@/domain/types';

export type RtwStatus = 'in_progress' | 'completed' | 'forfeited';

export type RtwAction =
  | { type: 'throw'; participantId: string; segment: ThrowSegment; value: number }
  | { type: 'forfeit'; participantId: string }
  | { type: 'note'; text: string }
  | { type: 'undo' };

export type RtwDart = {
  eventId: string;
  segment: ThrowSegment;
  value: number;
  targetIndex: number;
  isHit: boolean;
};

export type RtwTurn = {
  participantId: string;
  darts: RtwDart[];
  closed: boolean;
  advanced: boolean;
  targetIndexAtStart: number;
};

export type RtwThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
  targetIndex: number;
  dartInTurn: number;
};

export type RtwState = {
  sessionId: string;
  participantIds: string[];
  config: RtwConfig;
  status: RtwStatus;
  inputEventLog: GameEvent[];
  targetSequence: number[];
  currentTargetIndex: number;
  dartsInCurrentTurn: number;
  hitsInCurrentTurn: number;
  turns: RtwTurn[];
  activeParticipantId: string;
  winnerParticipantId?: string;
};

export type RtwViewModel = {
  status: RtwStatus;
  config: RtwConfig;
  targetSequence: number[];
  currentTargetIndex: number;
  currentTarget: number | null;
  dartsInCurrentTurn: number;
  hitsInCurrentTurn: number;
  canUndo: boolean;
  activeParticipantId: string;
  winnerParticipantId?: string;
  lastTurn: RtwTurn | null;
  totalDarts: number;
  targetsHit: number;
  targetsTotal: number;
  dartsPerTurn: number;
};
