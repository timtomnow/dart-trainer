import { z } from 'zod';
import { Iso8601, SchemaVersion, Ulid } from './common';

export const SessionStatus = z.enum([
  'in_progress',
  'completed',
  'forfeited',
  'abandoned',
  'deleted'
]);

export type SessionStatus = z.infer<typeof SessionStatus>;

export const Session = z.object({
  schemaVersion: SchemaVersion,
  id: Ulid,
  gameModeId: z.string().min(1),
  gameConfig: z.unknown(),
  participants: z.array(Ulid).min(1),
  status: SessionStatus,
  startedAt: Iso8601,
  endedAt: Iso8601.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: Iso8601,
  updatedAt: Iso8601
});

export type Session = z.infer<typeof Session>;
