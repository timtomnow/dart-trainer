import { z } from 'zod';
import { AppSettings } from './appSettings';
import { Iso8601, SchemaVersion } from './common';
import { DerivedStats } from './derivedStats';
import { GameEvent } from './gameEvent';
import { PlayerProfile } from './playerProfile';
import { ProfilePreferences } from './profilePreferences';
import { Session } from './session';

export const BackupCounts = z.object({
  profiles: z.number().int().nonnegative(),
  profilePrefs: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  events: z.number().int().nonnegative(),
  derivedStats: z.number().int().nonnegative(),
  drills: z.number().int().nonnegative()
});
export type BackupCounts = z.infer<typeof BackupCounts>;

export const BackupData = z.object({
  settings: AppSettings.nullable(),
  profiles: z.array(PlayerProfile),
  profilePrefs: z.array(ProfilePreferences),
  sessions: z.array(Session),
  events: z.array(GameEvent),
  derivedStats: z.array(DerivedStats),
  drills: z.array(z.unknown())
});
export type BackupData = z.infer<typeof BackupData>;

export const BackupManifest = z.object({
  schemaVersion: SchemaVersion,
  appVersion: z.string().min(1),
  exportedAt: Iso8601,
  deviceLabel: z.string().min(1).optional(),
  contentHash: z.string().min(1),
  counts: BackupCounts,
  data: BackupData
});
export type BackupManifest = z.infer<typeof BackupManifest>;
