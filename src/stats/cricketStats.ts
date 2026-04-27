import type { CricketParticipantStats, CricketSessionStats } from './types';
import type { GameEvent, Session } from '@/domain/types';
import type { CricketConfig } from '@/games/cricket/config';
import { buildCricketState } from '@/games/cricket/replay';
import type { CricketTurn } from '@/games/cricket/types';

type SessionShape = Pick<Session, 'id' | 'participants' | 'startedAt'>;

export function computeCricketStats(
  events: GameEvent[],
  config: CricketConfig,
  session: SessionShape
): CricketSessionStats {
  const state = buildCricketState(events, config, session.participants, session.id);

  let totalMarks = 0;
  let dartsThrown = 0;
  let totalScored = 0;
  let rounds = 0;

  for (const leg of state.legs) {
    for (const turn of leg.turns) {
      if (!turn.closed) continue;
      dartsThrown += turn.darts.length;
      totalMarks += turn.marked;
      totalScored += turn.scored;
      rounds++;
    }
  }

  const marksPerRound = rounds > 0 ? totalMarks / rounds : 0;

  const lastEvent = events[events.length - 1];
  const durationMs = lastEvent
    ? new Date(lastEvent.timestamp).getTime() - new Date(session.startedAt).getTime()
    : 0;

  const allTurns = state.legs.flatMap((l) => l.turns);
  const byParticipant =
    session.participants.length > 1
      ? computeCricketByParticipant(allTurns, session.participants)
      : undefined;

  return { marksPerRound, totalMarks, dartsThrown, totalScored, durationMs, byParticipant };
}

function computeCricketByParticipant(
  allTurns: CricketTurn[],
  participantIds: string[]
): Record<string, CricketParticipantStats> {
  const result: Record<string, CricketParticipantStats> = {};
  for (const pid of participantIds) {
    const turns = allTurns.filter((t) => t.participantId === pid && t.closed);
    const totalMarks = turns.reduce((s, t) => s + t.marked, 0);
    const totalScored = turns.reduce((s, t) => s + t.scored, 0);
    const dartsThrown = turns.reduce((s, t) => s + t.darts.length, 0);
    const marksPerRound = turns.length > 0 ? totalMarks / turns.length : 0;
    result[pid] = { marksPerRound, totalMarks, totalScored, dartsThrown };
  }
  return result;
}
