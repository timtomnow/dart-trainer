import type { RtwScoringConfig } from './config';
import type { GameEvent, ThrowSegment } from '@/domain/types';

export type RtwScoringStatus = 'in_progress' | 'completed' | 'forfeited';

export type RtwScoringAction =
  | { type: 'throw'; participantId: string; segment: ThrowSegment; value: number }
  | { type: 'forfeit'; participantId: string }
  | { type: 'note'; text: string }
  | { type: 'undo' };

export type RtwScoringDart = {
  eventId: string;
  segment: ThrowSegment;
  value: number;
  targetIndex: number;
  isHit: boolean;
  scored: number;
};

export type RtwScoringTurn = {
  participantId: string;
  darts: RtwScoringDart[];
  closed: boolean;
  advanced: boolean;
  targetIndexAtStart: number;
  turnScore: number;
};

export type RtwScoringThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
  targetIndex: number;
  dartInTurn: number;
};

export type RtwScoringState = {
  sessionId: string;
  participantIds: string[];
  config: RtwScoringConfig;
  status: RtwScoringStatus;
  inputEventLog: GameEvent[];
  targetSequence: number[];
  currentTargetIndex: number;
  dartsInCurrentTurn: number;
  hitsInCurrentTurn: number;
  turns: RtwScoringTurn[];
  totalScore: number;
  activeParticipantId: string;
  winnerParticipantId?: string;
};

export type RtwScoringViewModel = {
  status: RtwScoringStatus;
  config: RtwScoringConfig;
  targetSequence: number[];
  currentTargetIndex: number;
  currentTarget: number | null;
  dartsInCurrentTurn: number;
  hitsInCurrentTurn: number;
  canUndo: boolean;
  activeParticipantId: string;
  winnerParticipantId?: string;
  lastTurn: RtwScoringTurn | null;
  totalDarts: number;
  targetsHit: number;
  targetsTotal: number;
  dartsPerTurn: number;
  totalScore: number;
  currentTurnScore: number;
};
