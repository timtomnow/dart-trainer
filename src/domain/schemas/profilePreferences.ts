import { z } from 'zod';
import { SchemaVersion, Ulid } from './common';

export const X01Start = z.union([z.literal(301), z.literal(501), z.literal(701)]);
export const InRule = z.enum(['straight', 'double']);
export const OutRule = z.enum(['straight', 'double', 'masters']);

export const ProfilePreferences = z.object({
  schemaVersion: SchemaVersion,
  profileId: Ulid,
  defaultX01Start: X01Start.optional(),
  defaultInRule: InRule.optional(),
  defaultOutRule: OutRule.optional(),
  defaultLegsToWin: z.number().int().positive().optional()
});

export type ProfilePreferences = z.infer<typeof ProfilePreferences>;
