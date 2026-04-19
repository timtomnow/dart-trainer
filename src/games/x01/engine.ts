import { X01_GAME_ID } from './config';
import type { X01Config } from './config';
import { buildX01State } from './replay';
import type {
  X01Action,
  X01DartIndex,
  X01State,
  X01ThrowPayload,
  X01ViewModel
} from './types';
import { isInputEventType } from '@/domain/events';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas/common';
import type { GameEvent, GameEventType } from '@/domain/types';
import type {
  EngineReduceResult,
  EngineSeeds,
  GameEngine
} from '@/games/engine';
import { isValidDart } from '@/games/engine/common';
import { computeX01LegStats } from '@/stats/x01Inline';

function initialState(
  config: X01Config,
  participantIds: string[],
  sessionId: string
): X01State {
  return buildX01State([], config, participantIds, sessionId);
}

function error(
  state: X01State,
  code: string,
  message: string
): EngineReduceResult<X01State> {
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
  state: X01State,
  action: X01Action,
  seeds: EngineSeeds
): EngineReduceResult<X01State> {
  if (action.type === 'undo') {
    const last = state.inputEventLog.at(-1);
    if (!last) return error(state, 'nothing_to_undo', 'No input events to undo.');
    const nextLog = state.inputEventLog.slice(0, -1);
    return {
      state: buildX01State(nextLog, state.config, state.participantIds, state.sessionId),
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
      return error(
        state,
        'wrong_turn',
        `Not this participant's turn: ${action.participantId}`
      );
    }
    if (!isValidDart({ segment: action.segment, value: action.value })) {
      return error(
        state,
        'invalid_dart',
        `Invalid dart: ${action.segment}:${action.value}`
      );
    }

    const leg = state.legs.at(-1);
    const legIndex = leg && leg.winnerParticipantId === undefined ? leg.index : (leg?.index ?? -1) + 1;
    const openTurn = leg && leg.winnerParticipantId === undefined
      ? leg.turns.find((t) => !t.closed)
      : undefined;
    const turnIndexInLeg = openTurn
      ? openTurn.indexInLeg
      : leg && leg.winnerParticipantId === undefined
        ? leg.turns.length
        : 0;
    const dartIndex: X01DartIndex = (openTurn ? openTurn.darts.length : 0) as X01DartIndex;

    const payload: X01ThrowPayload = {
      participantId: action.participantId,
      segment: action.segment,
      value: action.value,
      dartIndex,
      legIndex,
      turnIndexInLeg
    };
    const event = makeEvent(state.sessionId, nextSeq, 'throw', payload, seeds);
    const nextLog = [...state.inputEventLog, event];
    const nextState = buildX01State(
      nextLog,
      state.config,
      state.participantIds,
      state.sessionId
    );
    return { state: nextState, emit: [event], pop: [] };
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
      state: buildX01State(nextLog, state.config, state.participantIds, state.sessionId),
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
      state: buildX01State(nextLog, state.config, state.participantIds, state.sessionId),
      emit: [event],
      pop: []
    };
  }

  return error(state, 'unknown_action', 'Unknown action.');
}

function view(state: X01State): X01ViewModel {
  const leg = state.legs.at(-1);
  const activeId = state.activeParticipantId;

  const activeLegForStats = leg && leg.winnerParticipantId === undefined
    ? leg
    : state.legs.at(-1);

  const openTurn = leg && leg.winnerParticipantId === undefined
    ? leg.turns.find((t) => !t.closed)
    : undefined;
  const lastClosedInLeg = leg
    ? [...leg.turns].reverse().find((t) => t.closed) ?? null
    : null;

  const legIsOpen = leg !== undefined && leg.winnerParticipantId === undefined;
  const sessionEnded = state.status !== 'in_progress';
  const workingRemaining = openTurn
    ? openTurn.bust
      ? openTurn.startRemaining
      : openTurn.startRemaining - openTurn.scored
    : undefined;
  const remaining = legIsOpen
    ? workingRemaining ?? leg.remaining[activeId] ?? state.config.startScore
    : sessionEnded && leg
      ? leg.remaining[activeId] ?? state.config.startScore
      : state.config.startScore;
  const opened = legIsOpen
    ? leg.opened[activeId] ?? false
    : state.config.inRule === 'straight';

  const currentTurn = {
    darts: openTurn
      ? openTurn.darts.map((d) => ({
          segment: d.segment,
          value: d.value,
          scored: d.scored
        }))
      : [],
    scored: openTurn?.scored ?? 0,
    bust: openTurn?.bust ?? false,
    dartIndex: (openTurn ? openTurn.darts.length : 0) as X01DartIndex
  };

  const lastClosedTurn = lastClosedInLeg
    ? {
        participantId: lastClosedInLeg.participantId,
        scored: lastClosedInLeg.scored,
        bust: lastClosedInLeg.bust,
        checkout: lastClosedInLeg.checkout
      }
    : null;

  const legStats = computeX01LegStats(activeLegForStats, activeId, state.config);

  return {
    status: state.status,
    config: state.config,
    legIndex: state.currentLegIndex,
    legsWon: state.legsWon,
    activeParticipantId: activeId,
    remaining,
    opened,
    currentTurn,
    lastClosedTurn,
    canUndo: state.inputEventLog.length > 0,
    winnerParticipantId: state.winnerParticipantId,
    legStats
  };
}

function replay(
  events: GameEvent[],
  config: X01Config,
  participantIds: string[],
  sessionId: string
): X01State {
  const inputOnly = events.filter((e) => isInputEventType(e.type));
  return buildX01State(inputOnly, config, participantIds, sessionId);
}

export const x01Engine: GameEngine<X01Config, X01State, X01Action, X01ViewModel> = {
  id: X01_GAME_ID,
  init: (config, participantIds, sessionId) => initialState(config, participantIds, sessionId),
  reduce,
  isLegOver: (state) => {
    const leg = state.legs.at(-1);
    if (!leg || leg.winnerParticipantId === undefined) return null;
    return { legIndex: leg.index, winnerParticipantId: leg.winnerParticipantId };
  },
  isSessionOver: (state) => {
    if (state.status === 'completed') return { status: 'completed' };
    if (state.status === 'forfeited') return { status: 'forfeited' };
    return null;
  },
  view,
  replay
};
