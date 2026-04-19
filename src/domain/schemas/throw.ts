import { z } from 'zod';
import { Iso8601, SchemaVersion, Ulid } from './common';

export const ThrowSegment = z.enum(['S', 'D', 'T', 'SB', 'DB', 'MISS']);
export type ThrowSegment = z.infer<typeof ThrowSegment>;

export const ThrowIndex = z.union([z.literal(0), z.literal(1), z.literal(2)]);

export const Throw = z.object({
  schemaVersion: SchemaVersion,
  id: Ulid,
  turnId: Ulid,
  index: ThrowIndex,
  segment: ThrowSegment,
  value: z.number().int().min(0).max(60),
  timestamp: Iso8601
});

export type Throw = z.infer<typeof Throw>;
