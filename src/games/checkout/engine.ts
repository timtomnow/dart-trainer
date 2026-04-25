import { CHECKOUT_GAME_ID } from './config';
import type { CheckoutConfig } from './config';
import { buildCheckoutState } from './replay';
import type {
  CheckoutAction,
  CheckoutState,
  CheckoutThrowPayload,
  CheckoutViewModel
} from './types';
import { isInputEventType } from '@/domain/events';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas/common';
import type { GameEvent, GameEventType } from '@/domain/types';
import type { EngineReduceResult, EngineSeeds, GameEngine } from '@/games/engine';

function error(
  state: CheckoutState,
  code: string,
  message: string
): EngineReduceResult<CheckoutState> {
  return { state, emit: [], pop: [], error: { code, message } };
}

function makeEvent(
  sessionId: string,
  seq: number,
  type: GameEventType,
  payload: unknown,
  seeds: EngineSeeds
): GameEvent {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: seeds.newId(),
    sessionId,
    seq,
    type,
    payload,
    timestamp: seeds.now()
  };
}

function reduce(
  state: CheckoutState,
  action: CheckoutAction,
  seeds: EngineSeeds
): EngineReduceResult<CheckoutState> {
  if (action.type === 'undo') {
    const last = state.inputEventLog.at(-1);
    if (!last) return error(state, 'nothing_to_undo', 'No input events to undo.');
    const nextLog = state.inputEventLog.slice(0, -1);
    return {
      state: buildCheckoutState(nextLog, state.config, state.participantIds, state.sessionId),
      emit: [],
      pop: [last.id]
    };
  }

  if (state.status === 'forfeited') {
    return error(state, 'session_forfeited', 'Session is forfeited. Undo to resume.');
  }
  if (state.status === 'completed') {
    return error(state, 'session_completed', 'Session already completed.');
  }

  const nextSeq = state.inputEventLog.length;

  if (action.type === 'throw') {
    if (!state.participantIds.includes(action.participantId)) {
      return error(state, 'unknown_participant', `Unknown participant: ${action.participantId}`);
    }
    const payload: CheckoutThrowPayload = {
      participantId: action.participantId,
      segment: action.segment,
      value: action.value
    };
    const event = makeEvent(state.sessionId, nextSeq, 'throw', payload, seeds);
    const nextLog = [...state.inputEventLog, event];
    return {
      state: buildCheckoutState(nextLog, state.config, state.participantIds, state.sessionId),
      emit: [event],
      pop: []
    };
  }

  if (action.type === 'forfeit') {
    if (!state.participantIds.includes(action.participantId)) {
      return error(state, 'unknown_participant', `Unknown participant: ${action.participantId}`);
    }
    const event = makeEvent(
      state.sessionId,
      nextSeq,
      'forfeit',
      { participantId: action.participantId },
      seeds
    );
    const nextLog = [...state.inputEventLog, event];
    return {
      state: buildCheckoutState(nextLog, state.config, state.participantIds, state.sessionId),
      emit: [event],
      pop: []
    };
  }

  if (action.type === 'note') {
    const text = action.text.trim();
    if (!text) return error(state, 'empty_note', 'Note text must not be empty.');
    const event = makeEvent(state.sessionId, nextSeq, 'note', { text }, seeds);
    const nextLog = [...state.inputEventLog, event];
    return {
      state: buildCheckoutState(nextLog, state.config, state.participantIds, state.sessionId),
      emit: [event],
      pop: []
    };
  }

  return error(state, 'unknown_action', 'Unknown action.');
}

function view(state: CheckoutState): CheckoutViewModel {
  const successCount = state.attempts.filter((a) => a.success).length;
  const totalAttemptsCompleted = state.attempts.length;
  const successRate =
    totalAttemptsCompleted > 0 ? (successCount / totalAttemptsCompleted) * 100 : null;

  return {
    status: state.status,
    config: state.config,
    currentFinish: state.orderedFinishes[state.currentFinishIndex] ?? null,
    currentFinishIndex: state.currentFinishIndex,
    totalFinishes: state.orderedFinishes.length,
    currentAttempt: state.currentAttemptInFinish + 1,
    totalAttempts: state.config.attemptsPerFinish,
    dartsInCurrentAttempt: state.dartsInCurrentAttempt,
    remainingInCurrentAttempt: state.remainingInCurrentAttempt,
    canUndo: state.inputEventLog.length > 0,
    activeParticipantId: state.activeParticipantId,
    attempts: state.attempts,
    successCount,
    successRate,
    totalAttemptsCompleted
  };
}

function replay(
  events: GameEvent[],
  config: CheckoutConfig,
  participantIds: string[],
  sessionId: string
): CheckoutState {
  const inputOnly = events.filter((e) => isInputEventType(e.type));
  return buildCheckoutState(inputOnly, config, participantIds, sessionId);
}

export const checkoutEngine: GameEngine<
  CheckoutConfig,
  CheckoutState,
  CheckoutAction,
  CheckoutViewModel
> = {
  id: CHECKOUT_GAME_ID,
  init: (config, participantIds, sessionId) =>
    buildCheckoutState([], config, participantIds, sessionId),
  reduce,
  isLegOver: (state) => {
    if (state.status === 'completed')
      return { legIndex: 0, winnerParticipantId: state.activeParticipantId };
    return null;
  },
  isSessionOver: (state) => {
    if (state.status === 'completed') return { status: 'completed' };
    if (state.status === 'forfeited') return { status: 'forfeited' };
    return null;
  },
  view,
  replay
};
