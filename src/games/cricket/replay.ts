import type { CricketConfig } from './config';
import { applyMark, isWinner, marksFromSegment, targetFromDart } from './rules';
import { CRICKET_TARGETS, type CricketDart, type CricketLeg, type CricketState, type CricketStatus, type CricketTurn } from './types';
import type { GameEvent, ThrowSegment } from '@/domain/types';

type ThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
};

function createLeg(index: number, startedAt: string, participantIds: string[]): CricketLeg {
  const marks: Record<string, Record<number, number>> = {};
  const score: Record<string, number> = {};
  for (const p of participantIds) {
    marks[p] = {};
    for (const t of CRICKET_TARGETS) marks[p]![t] = 0;
    score[p] = 0;
  }
  return { index, startedAt, turns: [], marks, score };
}

function legStarter(legIndex: number, participantIds: string[]): string {
  return participantIds[legIndex % participantIds.length]!;
}

function nextTurnParticipant(leg: CricketLeg, participantIds: string[]): string {
  const lastClosed = [...leg.turns].reverse().find((t) => t.closed);
  if (!lastClosed) return legStarter(leg.index, participantIds);
  const idx = participantIds.indexOf(lastClosed.participantId);
  return participantIds[(idx + 1) % participantIds.length]!;
}

function activeLeg(legs: CricketLeg[], participantIds: string[], startedAt: string): CricketLeg {
  const last = legs.at(-1);
  if (last && last.winnerParticipantId === undefined) return last;
  const nextIndex = last ? last.index + 1 : 0;
  const leg = createLeg(nextIndex, startedAt, participantIds);
  legs.push(leg);
  return leg;
}

function activeTurn(leg: CricketLeg, participantIds: string[], startedAt: string): CricketTurn {
  const last = leg.turns.at(-1);
  if (last && !last.closed) return last;
  const pid = nextTurnParticipant(leg, participantIds);
  const turn: CricketTurn = {
    participantId: pid,
    indexInLeg: leg.turns.length,
    startedAt,
    darts: [],
    closed: false,
    marked: 0,
    scored: 0
  };
  leg.turns.push(turn);
  return turn;
}

function computeActive(
  leg: CricketLeg | undefined,
  participantIds: string[],
  status: CricketStatus
): string {
  if (status !== 'in_progress') {
    if (leg) {
      const last = leg.turns.at(-1);
      if (last) return last.participantId;
    }
    return participantIds[0]!;
  }
  if (!leg) return legStarter(0, participantIds);
  if (leg.winnerParticipantId !== undefined) return legStarter(leg.index + 1, participantIds);
  const openTurn = leg.turns.find((t) => !t.closed);
  if (openTurn) return openTurn.participantId;
  return nextTurnParticipant(leg, participantIds);
}

export function buildCricketState(
  events: GameEvent[],
  config: CricketConfig,
  participantIds: string[],
  sessionId: string
): CricketState {
  const legs: CricketLeg[] = [];
  const legsWon: Record<string, number> = {};
  for (const p of participantIds) legsWon[p] = 0;

  let status: CricketStatus = 'in_progress';
  let winnerParticipantId: string | undefined;

  for (const ev of events) {
    if (status !== 'in_progress') break;

    if (ev.type === 'note') continue;

    if (ev.type === 'forfeit') {
      status = 'forfeited';
      continue;
    }

    if (ev.type !== 'throw') continue;

    const payload = ev.payload as ThrowPayload;
    const leg = activeLeg(legs, participantIds, ev.timestamp);
    const turn = activeTurn(leg, participantIds, ev.timestamp);

    const target = targetFromDart(payload.segment, payload.value);
    const rawMarks = marksFromSegment(payload.segment);

    const dart: CricketDart = {
      eventId: ev.id,
      segment: payload.segment,
      value: payload.value,
      target,
      marksAwarded: 0,
      scored: 0
    };

    if (target !== null && rawMarks > 0) {
      const prevMarks = leg.marks[payload.participantId]![target] ?? 0;
      const outcome = applyMark({
        target,
        prevMarks,
        incomingMarks: rawMarks,
        allMarks: leg.marks,
        participantId: payload.participantId,
        participantIds
      });

      dart.marksAwarded = outcome.marksAwarded;
      dart.scored = outcome.scored;

      leg.marks[payload.participantId]![target] = Math.min(3, prevMarks + rawMarks);
      leg.score[payload.participantId]! += outcome.scored;
    }

    turn.darts.push(dart);
    turn.marked += dart.marksAwarded;
    turn.scored += dart.scored;

    const myMarks = leg.marks[payload.participantId]!;
    const myScore = leg.score[payload.participantId]!;
    if (isWinner(myMarks, myScore, leg.score, payload.participantId)) {
      leg.winnerParticipantId = payload.participantId;
      leg.endedAt = ev.timestamp;
      turn.closed = true;
      turn.endedAt = ev.timestamp;
      legsWon[payload.participantId] = (legsWon[payload.participantId] ?? 0) + 1;
      if (legsWon[payload.participantId]! >= config.legsToWin) {
        winnerParticipantId = payload.participantId;
        status = 'completed';
      } else {
        legs.push(createLeg(leg.index + 1, ev.timestamp, participantIds));
      }
      continue;
    }

    if (turn.darts.length === 3) {
      turn.closed = true;
      turn.endedAt = ev.timestamp;
    }
  }

  const currentLegIndex = legs.length === 0 ? 0 : legs.at(-1)!.index;

  return {
    sessionId,
    participantIds,
    config,
    status,
    inputEventLog: events.filter(
      (e) => e.type === 'throw' || e.type === 'forfeit' || e.type === 'note'
    ),
    legs,
    currentLegIndex,
    legsWon,
    activeParticipantId: computeActive(legs.at(-1), participantIds, status),
    winnerParticipantId
  };
}
