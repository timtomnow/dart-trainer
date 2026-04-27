import type { RtwConfig } from './config';
import type { GameEvent } from '@/domain/types';

export type RtwStatus = 'in_progress' | 'completed' | 'forfeited';

export type RtwAction =
  | { type: 'throw'; participantId: string; hit: boolean }
  | { type: 'throw'; participantId: string; hitsInTurn: 0 | 1 | 2 | 3 }
  | { type: 'forfeit'; participantId: string }
  | { type: 'note'; text: string }
  | { type: 'undo' };

export type RtwThrowPayload =
  | { participantId: string; targetIndex: number; targetValue: number; hit: boolean }
  | { participantId: string; targetIndex: number; targetValue: number; hitsInTurn: 0 | 1 | 2 | 3 };

export type RtwTurn = {
  participantId: string;
  targetIndexAtStart: number;
  hitsInTurn: number;
  dartsInTurn: number;
  closed: boolean;
  advanced: boolean;
};

export type RtwState = {
  sessionId: string;
  participantIds: string[];
  config: RtwConfig;
  status: RtwStatus;
  inputEventLog: GameEvent[];
  targetSequence: number[];
  participantTargetIndices: Record<string, number>;
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
  participantIds: string[];
  winnerParticipantId?: string;
  lastTurn: RtwTurn | null;
  totalDarts: number;
  targetsHit: number;
  targetsTotal: number;
  dartsPerTurn: number;
  participantTargetIndices?: Record<string, number>;
};
