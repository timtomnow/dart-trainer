import { RTW_GAME_ID } from './config';
import type { RtwConfig } from './config';
import { buildRtwState } from './replay';
import { dartsPerTurn } from './rules';
import type { RtwAction, RtwState, RtwThrowPayload, RtwTurn, RtwViewModel } from './types';
import { isInputEventType } from '@/domain/events';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas/common';
import type { GameEvent, GameEventType } from '@/domain/types';
import type { EngineReduceResult, EngineSeeds, GameEngine } from '@/games/engine';
import { isValidDart } from '@/games/engine/common';

function error(state: RtwState, code: string, message: string): EngineReduceResult<RtwState> {
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
  state: RtwState,
  action: RtwAction,
  seeds: EngineSeeds
): EngineReduceResult<RtwState> {
  if (action.type === 'undo') {
    const last = state.inputEventLog.at(-1);
    if (!last) return error(state, 'nothing_to_undo', 'No input events to undo.');
    const nextLog = state.inputEventLog.slice(0, -1);
    return {
      state: buildRtwState(nextLog, state.config, state.participantIds, state.sessionId),
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
    if (action.participantId !== state.activeParticipantId) {
      return error(state, 'wrong_turn', `Not this participant's turn: ${action.participantId}`);
    }
    if (!isValidDart({ segment: action.segment, value: action.value })) {
      return error(state, 'invalid_dart', `Invalid dart: ${action.segment}:${action.value}`);
    }

    const payload: RtwThrowPayload = {
      participantId: action.participantId,
      segment: action.segment,
      value: action.value,
      targetIndex: state.currentTargetIndex,
      dartInTurn: state.dartsInCurrentTurn
    };
    const event = makeEvent(state.sessionId, nextSeq, 'throw', payload, seeds);
    const nextLog = [...state.inputEventLog, event];
    return {
      state: buildRtwState(nextLog, state.config, state.participantIds, state.sessionId),
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
      state: buildRtwState(nextLog, state.config, state.participantIds, state.sessionId),
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
      state: buildRtwState(nextLog, state.config, state.participantIds, state.sessionId),
      emit: [event],
      pop: []
    };
  }

  return error(state, 'unknown_action', 'Unknown action.');
}

function view(state: RtwState): RtwViewModel {
  const totalDarts = state.turns.reduce((s, t) => s + t.darts.length, 0);
  const targetsHit = state.turns.filter((t: RtwTurn) => t.darts.some((d) => d.isHit)).length;
  const dpt = dartsPerTurn(state.config.mode);
  const lastClosedTurn = [...state.turns].reverse().find((t) => t.closed) ?? null;

  return {
    status: state.status,
    config: state.config,
    targetSequence: state.targetSequence,
    currentTargetIndex: state.currentTargetIndex,
    currentTarget: state.targetSequence[state.currentTargetIndex] ?? null,
    dartsInCurrentTurn: state.dartsInCurrentTurn,
    hitsInCurrentTurn: state.hitsInCurrentTurn,
    canUndo: state.inputEventLog.length > 0,
    activeParticipantId: state.activeParticipantId,
    winnerParticipantId: state.winnerParticipantId,
    lastTurn: lastClosedTurn,
    totalDarts,
    targetsHit,
    targetsTotal: state.targetSequence.length,
    dartsPerTurn: dpt
  };
}

function replay(
  events: GameEvent[],
  config: RtwConfig,
  participantIds: string[],
  sessionId: string
): RtwState {
  const inputOnly = events.filter((e) => isInputEventType(e.type));
  return buildRtwState(inputOnly, config, participantIds, sessionId);
}

export const rtwEngine: GameEngine<RtwConfig, RtwState, RtwAction, RtwViewModel> = {
  id: RTW_GAME_ID,
  init: (config, participantIds, sessionId) =>
    buildRtwState([], config, participantIds, sessionId),
  reduce,
  isLegOver: (state) => {
    if (state.status === 'completed') return { legIndex: 0, winnerParticipantId: state.winnerParticipantId };
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
