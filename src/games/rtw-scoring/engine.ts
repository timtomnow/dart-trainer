import { RTW_SCORING_GAME_ID } from './config';
import type { RtwScoringConfig } from './config';
import { buildRtwScoringState } from './replay';
import { isInvalidForTarget } from './rules';
import type {
  RtwScoringAction,
  RtwScoringState,
  RtwScoringThrowPayload,
  RtwScoringTurn,
  RtwScoringViewModel
} from './types';
import { isInputEventType } from '@/domain/events';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas/common';
import type { GameEvent, GameEventType } from '@/domain/types';
import type { EngineReduceResult, EngineSeeds, GameEngine } from '@/games/engine';

function error(
  state: RtwScoringState,
  code: string,
  message: string
): EngineReduceResult<RtwScoringState> {
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
  state: RtwScoringState,
  action: RtwScoringAction,
  seeds: EngineSeeds
): EngineReduceResult<RtwScoringState> {
  if (action.type === 'undo') {
    const last = state.inputEventLog.at(-1);
    if (!last) return error(state, 'nothing_to_undo', 'No input events to undo.');
    const nextLog = state.inputEventLog.slice(0, -1);
    return {
      state: buildRtwScoringState(nextLog, state.config, state.participantIds, state.sessionId),
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

    const currentTarget = state.targetSequence[state.currentTargetIndex];
    if (currentTarget === undefined) {
      return error(state, 'no_target', 'No current target.');
    }
    if (isInvalidForTarget(action.multiplier, currentTarget)) {
      return error(state, 'invalid_throw', 'Triple is not valid for Bull. Select Miss, Single, or Double.');
    }

    const payload: RtwScoringThrowPayload = {
      participantId: action.participantId,
      multiplier: action.multiplier,
      targetIndex: state.currentTargetIndex,
      targetValue: currentTarget,
      dartInTurn: state.dartsInCurrentTurn
    };
    const event = makeEvent(state.sessionId, nextSeq, 'throw', payload, seeds);
    const nextLog = [...state.inputEventLog, event];
    return {
      state: buildRtwScoringState(nextLog, state.config, state.participantIds, state.sessionId),
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
      state: buildRtwScoringState(nextLog, state.config, state.participantIds, state.sessionId),
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
      state: buildRtwScoringState(nextLog, state.config, state.participantIds, state.sessionId),
      emit: [event],
      pop: []
    };
  }

  return error(state, 'unknown_action', 'Unknown action.');
}

function view(state: RtwScoringState): RtwScoringViewModel {
  const totalDarts = state.turns.reduce((s, t) => s + t.darts.length, 0);
  const targetsHit = state.turns.filter((t: RtwScoringTurn) => t.darts.some((d) => d.score > 0)).length;
  const lastClosedTurn = [...state.turns].reverse().find((t) => t.closed) ?? null;
  const currentTurnScore =
    state.turns.length > 0 && !state.turns.at(-1)!.closed
      ? state.turns.at(-1)!.turnScore
      : 0;

  return {
    status: state.status,
    config: state.config,
    targetSequence: state.targetSequence,
    currentTargetIndex: state.currentTargetIndex,
    currentTarget: state.targetSequence[state.currentTargetIndex] ?? null,
    dartsInCurrentTurn: state.dartsInCurrentTurn,
    canUndo: state.inputEventLog.length > 0,
    activeParticipantId: state.activeParticipantId,
    winnerParticipantId: state.winnerParticipantId,
    lastTurn: lastClosedTurn,
    totalDarts,
    targetsHit,
    targetsTotal: state.targetSequence.length,
    totalScore: state.totalScore,
    currentTurnScore
  };
}

function replay(
  events: GameEvent[],
  config: RtwScoringConfig,
  participantIds: string[],
  sessionId: string
): RtwScoringState {
  const inputOnly = events.filter((e) => isInputEventType(e.type));
  return buildRtwScoringState(inputOnly, config, participantIds, sessionId);
}

export const rtwScoringEngine: GameEngine<
  RtwScoringConfig,
  RtwScoringState,
  RtwScoringAction,
  RtwScoringViewModel
> = {
  id: RTW_SCORING_GAME_ID,
  init: (config, participantIds, sessionId) =>
    buildRtwScoringState([], config, participantIds, sessionId),
  reduce,
  isLegOver: (state) => {
    if (state.status === 'completed')
      return { legIndex: 0, winnerParticipantId: state.winnerParticipantId };
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
