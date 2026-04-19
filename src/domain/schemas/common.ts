import { z } from 'zod';
import { ULID_REGEX } from '@/domain/ids';

export const CURRENT_SCHEMA_VERSION = 1 as const;

export const SchemaVersion = z.literal(CURRENT_SCHEMA_VERSION);

export const Ulid = z.string().regex(ULID_REGEX, 'Invalid ULID');

export const Iso8601 = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid ISO 8601 timestamp');

export const Handedness = z.enum(['left', 'right', 'ambi']);
export type Handedness = z.infer<typeof Handedness>;

export const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color');
