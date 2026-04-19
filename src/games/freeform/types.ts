import type { GameEvent, ThrowSegment } from '@/domain/types';

export type FreeformConfig = Record<string, never>;

export type FreeformDartIndex = 0 | 1 | 2;

export type FreeformAction =
  | {
      type: 'throw';
      participantId: string;
      segment: ThrowSegment;
      value: number;
      dartIndex: FreeformDartIndex;
    }
  | { type: 'forfeit'; participantId: string }
  | { type: 'note'; text: string }
  | { type: 'undo' };

export type FreeformStatus = 'in_progress' | 'forfeited';

export type FreeformState = {
  sessionId: string;
  participantIds: string[];
  status: FreeformStatus;
  inputEventLog: GameEvent[];
};

export type FreeformThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
  dartIndex: FreeformDartIndex;
};

export type FreeformForfeitPayload = { participantId: string };
export type FreeformNotePayload = { text: string };

export type FreeformViewModel = {
  status: FreeformStatus;
  throwCount: number;
  lastThrow:
    | {
        segment: ThrowSegment;
        value: number;
        participantId: string;
      }
    | null;
  canUndo: boolean;
};
