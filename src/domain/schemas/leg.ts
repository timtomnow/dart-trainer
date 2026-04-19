import { z } from 'zod';
import { Iso8601, SchemaVersion, Ulid } from './common';

export const Leg = z.object({
  schemaVersion: SchemaVersion,
  id: Ulid,
  sessionId: Ulid,
  index: z.number().int().nonnegative(),
  startedAt: Iso8601,
  endedAt: Iso8601.optional(),
  winnerProfileId: Ulid.optional()
});

export type Leg = z.infer<typeof Leg>;
