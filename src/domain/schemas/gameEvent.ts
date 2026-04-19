import { z } from 'zod';
import { Iso8601, SchemaVersion, Ulid } from './common';

export const GameEventType = z.enum([
  'throw',
  'turn_end',
  'leg_end',
  'session_end',
  'correction',
  'undo',
  'note',
  'forfeit'
]);

export type GameEventType = z.infer<typeof GameEventType>;

export const GameEvent = z.object({
  schemaVersion: SchemaVersion,
  id: Ulid,
  sessionId: Ulid,
  seq: z.number().int().nonnegative(),
  type: GameEventType,
  payload: z.unknown(),
  timestamp: Iso8601
});

export type GameEvent = z.infer<typeof GameEvent>;
