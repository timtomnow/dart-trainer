import { z } from 'zod';
import { Handedness, HexColor, Iso8601, SchemaVersion, Ulid } from './common';

export const PROFILE_NAME_MIN = 1;
export const PROFILE_NAME_MAX = 32;

export const ProfileName = z
  .string()
  .trim()
  .min(PROFILE_NAME_MIN, 'Name is required')
  .max(PROFILE_NAME_MAX, `Name must be ${PROFILE_NAME_MAX} characters or less`);

export const PlayerProfile = z.object({
  schemaVersion: SchemaVersion,
  id: Ulid,
  name: ProfileName,
  handedness: Handedness.optional(),
  avatarColor: HexColor.optional(),
  archived: z.boolean(),
  createdAt: Iso8601,
  updatedAt: Iso8601
});

export type PlayerProfile = z.infer<typeof PlayerProfile>;

export const CreateProfileInput = z.object({
  name: ProfileName,
  handedness: Handedness.optional(),
  avatarColor: HexColor.optional()
});

export type CreateProfileInput = z.infer<typeof CreateProfileInput>;
