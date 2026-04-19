import { z } from 'zod';
import { Iso8601, SchemaVersion, Ulid } from './common';

export const Turn = z.object({
  schemaVersion: SchemaVersion,
  id: Ulid,
  legId: Ulid,
  profileId: Ulid,
  index: z.number().int().nonnegative(),
  startedAt: Iso8601,
  endedAt: Iso8601.optional(),
  totalScored: z.number().int().nonnegative().optional(),
  bust: z.boolean().optional()
});

export type Turn = z.infer<typeof Turn>;
