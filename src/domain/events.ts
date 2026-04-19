import type { GameEventType } from './types';

const INPUT_EVENT_TYPES: ReadonlySet<GameEventType> = new Set<GameEventType>([
  'throw',
  'forfeit',
  'note'
]);

export function isInputEventType(type: GameEventType): boolean {
  return INPUT_EVENT_TYPES.has(type);
}
