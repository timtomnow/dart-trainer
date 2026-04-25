import type { CheckoutConfig } from './config';
import type { GameEvent, ThrowSegment } from '@/domain/types';

export type CheckoutStatus = 'in_progress' | 'completed' | 'forfeited';

export type CheckoutAction =
  | { type: 'throw'; participantId: string; segment: ThrowSegment; value: number }
  | { type: 'forfeit'; participantId: string }
  | { type: 'note'; text: string }
  | { type: 'undo' };

export type CheckoutThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
};

export type CheckoutDart = {
  segment: ThrowSegment;
  value: number;
  scored: number;
  remainingAfter: number;
};

export type CheckoutAttempt = {
  finishIndex: number;
  attemptIndex: number;
  targetFinish: number;
  darts: CheckoutDart[];
  remainingAtEnd: number;
  success: boolean;
};

export type CheckoutState = {
  sessionId: string;
  participantIds: string[];
  config: CheckoutConfig;
  status: CheckoutStatus;
  inputEventLog: GameEvent[];
  orderedFinishes: number[];
  currentFinishIndex: number;
  currentAttemptInFinish: number;
  dartsInCurrentAttempt: number;
  remainingInCurrentAttempt: number;
  attempts: CheckoutAttempt[];
  activeParticipantId: string;
};

export type CheckoutViewModel = {
  status: CheckoutStatus;
  config: CheckoutConfig;
  currentFinish: number | null;
  currentFinishIndex: number;
  totalFinishes: number;
  currentAttempt: number;
  totalAttempts: number;
  dartsInCurrentAttempt: number;
  remainingInCurrentAttempt: number;
  canUndo: boolean;
  activeParticipantId: string;
  attempts: CheckoutAttempt[];
  successCount: number;
  successRate: number | null;
  totalAttemptsCompleted: number;
};
