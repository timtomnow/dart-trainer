import { z } from 'zod';
import { Iso8601, SchemaVersion } from './common';

export const DerivedStatsScope = z.enum(['session', 'profile', 'global']);
export type DerivedStatsScope = z.infer<typeof DerivedStatsScope>;

export const DerivedStats = z.object({
  schemaVersion: SchemaVersion,
  scope: DerivedStatsScope,
  key: z.string().min(1),
  sourceEventSeqMax: z.number().int().nonnegative(),
  average: z.number().optional(),
  checkoutPct: z.number().min(0).max(1).optional(),
  count180: z.number().int().nonnegative().optional(),
  doublesHitPct: z.number().min(0).max(1).optional(),
  firstNineAvg: z.number().optional(),
  computedAt: Iso8601.optional(),
  data: z.record(z.string(), z.unknown()).optional()
});

export type DerivedStats = z.infer<typeof DerivedStats>;
