import type { GameEvent, Session } from '@/domain/types';
import { parseX01Config } from '@/games/x01/config';
import { buildX01State } from '@/games/x01/replay';

export type HeadlineStat =
  | { kind: 'x01_highest_finish'; value: number }
  | { kind: 'freeform_throws'; value: number }
  | { kind: 'throws'; value: number };

export function formatHeadlineStat(stat: HeadlineStat): string {
  switch (stat.kind) {
    case 'x01_highest_finish':
      return stat.value > 0 ? `Best finish: ${stat.value}` : 'No finish';
    case 'freeform_throws':
    case 'throws':
      return `${stat.value} throw${stat.value === 1 ? '' : 's'}`;
  }
}

export function computeHeadlineStat(
  session: Session,
  events: GameEvent[]
): HeadlineStat {
  if (session.gameModeId === 'x01') {
    const config = parseX01Config(session.gameConfig);
    const state = buildX01State(events, config, session.participants, session.id);
    let highest = 0;
    for (const leg of state.legs) {
      for (const turn of leg.turns) {
        if (turn.checkout && turn.startRemaining > highest) {
          highest = turn.startRemaining;
        }
      }
    }
    return { kind: 'x01_highest_finish', value: highest };
  }

  const throwCount = events.filter((e) => e.type === 'throw').length;
  if (session.gameModeId === 'freeform') {
    return { kind: 'freeform_throws', value: throwCount };
  }
  return { kind: 'throws', value: throwCount };
}
