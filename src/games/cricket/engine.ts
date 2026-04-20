import { CRICKET_GAME_ID } from './config';
import type { CricketConfig } from './config';
import { buildCricketState } from './replay';
import type {
  CricketAction,
  CricketDartIndex,
  CricketLeg,
  CricketState,
  CricketThrowPayload,
  CricketViewModel
} from './types';
import { CRICKET_TARGETS } from './types';
import { isInputEventType } from '@/domain/events';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas/common';
import type { GameEvent, GameEventType } from '@/domain/types';
import type { EngineReduceResult, EngineSeeds, GameEngine } from '@/games/engine';
import { isValidDart } from '@/games/engine/common';

function error(
  state: CricketState,
  code: string,
  message: string
): EngineReduceResult<CricketState> {
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
  state: CricketState,
  action: CricketAction,
  seeds: EngineSeeds
): EngineReduceResult<CricketState> {
  if (action.type === 'undo') {
    const last = state.inputEventLog.at(-1);
    if (!last) return error(state, 'nothing_to_undo', 'No input events to undo.');
    const nextLog = state.inputEventLog.slice(0, -1);
    return {
      state: buildCricketState(nextLog, state.config, state.participantIds, state.sessionId),
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

    const leg = state.legs.at(-1);
    const legIndex =
      leg && leg.winnerParticipantId === undefined ? leg.index : (leg?.index ?? -1) + 1;
    const openTurn =
      leg && leg.winnerParticipantId === undefined
        ? leg.turns.find((t) => !t.closed)
        : undefined;
    const turnIndexInLeg = openTurn
      ? openTurn.indexInLeg
      : leg && leg.winnerParticipantId === undefined
        ? leg.turns.length
        : 0;
    const dartIndex: CricketDartIndex = (openTurn ? openTurn.darts.length : 0) as CricketDartIndex;

    const payload: CricketThrowPayload = {
      participantId: action.participantId,
      segment: action.segment,
      value: action.value,
      dartIndex,
      legIndex,
      turnIndexInLeg
    };
    const event = makeEvent(state.sessionId, nextSeq, 'throw', payload, seeds);
    const nextLog = [...state.inputEventLog, event];
    return {
      state: buildCricketState(nextLog, state.config, state.participantIds, state.sessionId),
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
      state: buildCricketState(nextLog, state.config, state.participantIds, state.sessionId),
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
      state: buildCricketState(nextLog, state.config, state.participantIds, state.sessionId),
      emit: [event],
      pop: []
    };
  }

  return error(state, 'unknown_action', 'Unknown action.');
}

function emptyMarks(participantIds: string[]): Record<string, Record<number, number>> {
  const m: Record<string, Record<number, number>> = {};
  for (const p of participantIds) {
    m[p] = {};
    for (const t of CRICKET_TARGETS) m[p]![t] = 0;
  }
  return m;
}

function emptyScore(participantIds: string[]): Record<string, number> {
  const s: Record<string, number> = {};
  for (const p of participantIds) s[p] = 0;
  return s;
}

function legMarks(leg: CricketLeg | undefined, participantIds: string[]) {
  return leg ? leg.marks : emptyMarks(participantIds);
}

function legScore(leg: CricketLeg | undefined, participantIds: string[]) {
  return leg ? leg.score : emptyScore(participantIds);
}

function view(state: CricketState): CricketViewModel {
  const leg = state.legs.at(-1);
  const activeId = state.activeParticipantId;

  const openTurn =
    leg && leg.winnerParticipantId === undefined ? leg.turns.find((t) => !t.closed) : undefined;
  const lastClosedInLeg = leg ? [...leg.turns].reverse().find((t) => t.closed) ?? null : null;

  const currentTurn = {
    darts: openTurn
      ? openTurn.darts.map((d) => ({
          segment: d.segment,
          value: d.value,
          target: d.target,
          marksAwarded: d.marksAwarded,
          scored: d.scored
        }))
      : [],
    dartIndex: (openTurn ? openTurn.darts.length : 0) as CricketDartIndex,
    marked: openTurn?.marked ?? 0,
    scored: openTurn?.scored ?? 0
  };

  const lastClosedTurn = lastClosedInLeg
    ? {
        participantId: lastClosedInLeg.participantId,
        marked: lastClosedInLeg.marked,
        scored: lastClosedInLeg.scored
      }
    : null;

  return {
    status: state.status,
    config: state.config,
    legIndex: state.currentLegIndex,
    legsWon: state.legsWon,
    activeParticipantId: activeId,
    participantIds: state.participantIds,
    marks: legMarks(leg, state.participantIds),
    score: legScore(leg, state.participantIds),
    currentTurn,
    lastClosedTurn,
    canUndo: state.inputEventLog.length > 0,
    winnerParticipantId: state.winnerParticipantId
  };
}

function replay(
  events: GameEvent[],
  config: CricketConfig,
  participantIds: string[],
  sessionId: string
): CricketState {
  const inputOnly = events.filter((e) => isInputEventType(e.type));
  return buildCricketState(inputOnly, config, participantIds, sessionId);
}

export const cricketEngine: GameEngine<CricketConfig, CricketState, CricketAction, CricketViewModel> =
  {
    id: CRICKET_GAME_ID,
    init: (config, participantIds, sessionId) =>
      buildCricketState([], config, participantIds, sessionId),
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
