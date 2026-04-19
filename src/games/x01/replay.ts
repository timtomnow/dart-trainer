import type { X01Config } from './config';
import { applyDart } from './rules';
import type {
  X01Dart,
  X01Leg,
  X01State,
  X01Status,
  X01Turn
} from './types';
import type { GameEvent, ThrowSegment } from '@/domain/types';

type ThrowPayload = {
  participantId: string;
  segment: ThrowSegment;
  value: number;
};

function createLeg(
  index: number,
  startedAt: string,
  participantIds: string[],
  config: X01Config
): X01Leg {
  const remaining: Record<string, number> = {};
  const opened: Record<string, boolean> = {};
  for (const p of participantIds) {
    remaining[p] = config.startScore;
    opened[p] = config.inRule === 'straight';
  }
  return { index, startedAt, turns: [], remaining, opened };
}

function legStarter(legIndex: number, participantIds: string[]): string {
  const starter = legIndex % participantIds.length;
  return participantIds[starter]!;
}

function nextTurnParticipant(leg: X01Leg, participantIds: string[]): string {
  const lastClosed = leg.turns.at(-1);
  if (!lastClosed) return legStarter(leg.index, participantIds);
  const idx = participantIds.indexOf(lastClosed.participantId);
  return participantIds[(idx + 1) % participantIds.length]!;
}

function openTurn(
  leg: X01Leg,
  participantIds: string[],
  startedAt: string
): X01Turn {
  const pid = nextTurnParticipant(leg, participantIds);
  const turn: X01Turn = {
    participantId: pid,
    indexInLeg: leg.turns.length,
    startRemaining: leg.remaining[pid]!,
    startedAt,
    darts: [],
    scored: 0,
    bust: false,
    closed: false,
    checkout: false
  };
  leg.turns.push(turn);
  return turn;
}

function activeLeg(
  legs: X01Leg[],
  participantIds: string[],
  config: X01Config,
  startedAt: string
): X01Leg {
  const last = legs.at(-1);
  if (last && last.winnerParticipantId === undefined) return last;
  const nextIndex = last ? last.index + 1 : 0;
  const leg = createLeg(nextIndex, startedAt, participantIds, config);
  legs.push(leg);
  return leg;
}

function activeTurn(
  leg: X01Leg,
  participantIds: string[],
  startedAt: string
): X01Turn {
  const last = leg.turns.at(-1);
  if (last && !last.closed) return last;
  return openTurn(leg, participantIds, startedAt);
}

type Working = { remaining: number; opened: boolean };

function workingFor(leg: X01Leg, turn: X01Turn): Working {
  if (turn.darts.length === 0) {
    return { remaining: turn.startRemaining, opened: leg.opened[turn.participantId]! };
  }
  // Recompute working from dart-level outcomes already recorded on the turn.
  return {
    remaining: turn.startRemaining - turn.scored,
    opened: leg.opened[turn.participantId]! || turn.darts.some((d) => d.scored > 0 && isDoubleDart(d))
  };
}

function isDoubleDart(d: X01Dart): boolean {
  return d.segment === 'D' || d.segment === 'DB';
}

function commitTurnClean(leg: X01Leg, turn: X01Turn, working: Working, endedAt: string): void {
  leg.remaining[turn.participantId] = working.remaining;
  leg.opened[turn.participantId] = working.opened;
  turn.closed = true;
  turn.endedAt = endedAt;
}

function commitBust(turn: X01Turn, endedAt: string): void {
  turn.bust = true;
  turn.closed = true;
  turn.endedAt = endedAt;
  turn.scored = 0;
}

function commitCheckout(
  leg: X01Leg,
  turn: X01Turn,
  scoredDart: number,
  endedAt: string
): void {
  leg.remaining[turn.participantId] = 0;
  leg.opened[turn.participantId] = true;
  leg.winnerParticipantId = turn.participantId;
  leg.endedAt = endedAt;
  turn.checkout = true;
  turn.closed = true;
  turn.endedAt = endedAt;
  turn.scored += scoredDart;
}

export function buildX01State(
  events: GameEvent[],
  config: X01Config,
  participantIds: string[],
  sessionId: string
): X01State {
  const legs: X01Leg[] = [];
  const legsWon: Record<string, number> = {};
  for (const p of participantIds) legsWon[p] = 0;

  let status: X01Status = 'in_progress';
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

    const leg = activeLeg(legs, participantIds, config, ev.timestamp);
    const turn = activeTurn(leg, participantIds, ev.timestamp);

    const working = workingFor(leg, turn);
    const outcome = applyDart({
      remaining: working.remaining,
      opened: working.opened,
      config,
      segment: payload.segment,
      value: payload.value
    });

    const dart: X01Dart = {
      eventId: ev.id,
      segment: payload.segment,
      value: payload.value,
      scored: 0
    };

    if (outcome.kind === 'score') {
      dart.scored = outcome.scored;
      turn.darts.push(dart);
      turn.scored += outcome.scored;
      if (turn.darts.length === 3) {
        commitTurnClean(
          leg,
          turn,
          { remaining: outcome.nextRemaining, opened: outcome.opened },
          ev.timestamp
        );
      }
    } else if (outcome.kind === 'ignored') {
      turn.darts.push(dart);
      if (turn.darts.length === 3) {
        commitTurnClean(
          leg,
          turn,
          { remaining: turn.startRemaining, opened: leg.opened[turn.participantId]! },
          ev.timestamp
        );
      }
    } else if (outcome.kind === 'bust') {
      turn.darts.push(dart);
      commitBust(turn, ev.timestamp);
    } else if (outcome.kind === 'checkout') {
      dart.scored = outcome.scored;
      turn.darts.push(dart);
      commitCheckout(leg, turn, outcome.scored, ev.timestamp);
      legsWon[turn.participantId] = (legsWon[turn.participantId] ?? 0) + 1;
      if (legsWon[turn.participantId]! >= config.legsToWin) {
        winnerParticipantId = turn.participantId;
        status = 'completed';
      } else {
        legs.push(createLeg(leg.index + 1, ev.timestamp, participantIds, config));
      }
    }
  }

  const currentLegIndex = legs.length === 0 ? 0 : legs.at(-1)!.index;
  const currentLegForActive = legs.at(-1);
  const activeParticipantId = computeActiveParticipant(
    currentLegForActive,
    participantIds,
    status
  );

  return {
    sessionId,
    participantIds,
    config,
    status,
    inputEventLog: events.filter((e) =>
      e.type === 'throw' || e.type === 'forfeit' || e.type === 'note'
    ),
    legs,
    currentLegIndex,
    legsWon,
    activeParticipantId,
    winnerParticipantId
  };
}

function computeActiveParticipant(
  leg: X01Leg | undefined,
  participantIds: string[],
  status: X01Status
): string {
  if (status !== 'in_progress') {
    // Keep last-known active; fall back to starter.
    if (leg) {
      const last = leg.turns.at(-1);
      if (last) return last.participantId;
    }
    return participantIds[0]!;
  }
  if (!leg) return legStarter(0, participantIds);
  if (leg.winnerParticipantId) {
    return legStarter(leg.index + 1, participantIds);
  }
  const openTurn = leg.turns.find((t) => !t.closed);
  if (openTurn) return openTurn.participantId;
  return nextTurnParticipant(leg, participantIds);
}
