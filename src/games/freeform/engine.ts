import type {
  FreeformAction,
  FreeformConfig,
  FreeformState,
  FreeformThrowPayload,
  FreeformViewModel
} from './types';
import { isInputEventType } from '@/domain/events';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas/common';
import type { GameEvent, GameEventType } from '@/domain/types';
import type {
  EngineReduceResult,
  EngineSeeds,
  GameEngine
} from '@/games/engine';

const FREEFORM_ID = 'freeform' as const;

function initialState(
  participantIds: string[],
  sessionId: string
): FreeformState {
  return {
    sessionId,
    participantIds: [...participantIds],
    status: 'in_progress',
    inputEventLog: []
  };
}

function makeEvent(
  state: FreeformState,
  type: GameEventType,
  payload: unknown,
  seeds: EngineSeeds
): GameEvent {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: seeds.newId(),
    sessionId: state.sessionId,
    seq: state.inputEventLog.length,
    type,
    payload,
    timestamp: seeds.now()
  };
}

function applyInputEvent(state: FreeformState, event: GameEvent): FreeformState {
  const nextLog = [...state.inputEventLog, event];
  if (event.type === 'forfeit') {
    return { ...state, status: 'forfeited', inputEventLog: nextLog };
  }
  return { ...state, inputEventLog: nextLog };
}

function error(
  state: FreeformState,
  code: string,
  message: string
): EngineReduceResult<FreeformState> {
  return { state, emit: [], pop: [], error: { code, message } };
}

function reduce(
  state: FreeformState,
  action: FreeformAction,
  seeds: EngineSeeds
): EngineReduceResult<FreeformState> {
  if (action.type === 'undo') {
    const last = state.inputEventLog.at(-1);
    if (!last) return error(state, 'nothing_to_undo', 'No input events to undo.');
    const remaining = state.inputEventLog.slice(0, -1);
    const hadForfeit = remaining.some((e) => e.type === 'forfeit');
    const nextStatus: FreeformState['status'] = hadForfeit ? 'forfeited' : 'in_progress';
    return {
      state: { ...state, status: nextStatus, inputEventLog: remaining },
      emit: [],
      pop: [last.id]
    };
  }

  if (state.status === 'forfeited') {
    return error(state, 'session_forfeited', 'Session is forfeited. Undo to resume.');
  }

  if (action.type === 'throw') {
    if (!state.participantIds.includes(action.participantId)) {
      return error(state, 'unknown_participant', `Unknown participant: ${action.participantId}`);
    }
    const event = makeEvent(
      state,
      'throw',
      {
        participantId: action.participantId,
        segment: action.segment,
        value: action.value,
        dartIndex: action.dartIndex
      },
      seeds
    );
    return { state: applyInputEvent(state, event), emit: [event], pop: [] };
  }

  if (action.type === 'forfeit') {
    if (!state.participantIds.includes(action.participantId)) {
      return error(state, 'unknown_participant', `Unknown participant: ${action.participantId}`);
    }
    const event = makeEvent(state, 'forfeit', { participantId: action.participantId }, seeds);
    return { state: applyInputEvent(state, event), emit: [event], pop: [] };
  }

  if (action.type === 'note') {
    const text = action.text.trim();
    if (!text) return error(state, 'empty_note', 'Note text must not be empty.');
    const event = makeEvent(state, 'note', { text }, seeds);
    return { state: applyInputEvent(state, event), emit: [event], pop: [] };
  }

  return error(state, 'unknown_action', 'Unknown action.');
}

function view(state: FreeformState): FreeformViewModel {
  const throws = state.inputEventLog.filter((e) => e.type === 'throw');
  const lastThrowEvent = throws.at(-1);
  const payload = (lastThrowEvent?.payload ?? null) as FreeformThrowPayload | null;
  return {
    status: state.status,
    throwCount: throws.length,
    lastThrow: payload
      ? {
          segment: payload.segment,
          value: payload.value,
          participantId: payload.participantId
        }
      : null,
    canUndo: state.inputEventLog.length > 0
  };
}

function replay(
  events: GameEvent[],
  _config: FreeformConfig,
  participantIds: string[],
  sessionId: string
): FreeformState {
  let state = initialState(participantIds, sessionId);
  for (const event of events) {
    if (!isInputEventType(event.type)) continue;
    state = applyInputEvent(state, event);
  }
  return state;
}

export const freeformEngine: GameEngine<
  FreeformConfig,
  FreeformState,
  FreeformAction,
  FreeformViewModel
> = {
  id: FREEFORM_ID,
  init: (_config, participantIds, sessionId) => initialState(participantIds, sessionId),
  reduce,
  isLegOver: () => null,
  isSessionOver: (state) =>
    state.status === 'forfeited' ? { status: 'forfeited' } : null,
  view,
  replay
};

export const FREEFORM_GAME_ID = FREEFORM_ID;
