import type { CricketSessionStats } from './types';
import type { GameEvent, Session } from '@/domain/types';
import type { CricketConfig } from '@/games/cricket/config';
import { buildCricketState } from '@/games/cricket/replay';

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

  return { marksPerRound, totalMarks, dartsThrown, totalScored, durationMs };
}
