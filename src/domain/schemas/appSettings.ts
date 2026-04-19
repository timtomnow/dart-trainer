import { z } from 'zod';
import { Iso8601, SchemaVersion, Ulid } from './common';

export const APP_SETTINGS_ID = 'app' as const;

export const AppSettings = z.object({
  schemaVersion: SchemaVersion,
  id: z.literal(APP_SETTINGS_ID),
  appVersion: z.string().min(1),
  activeProfileId: Ulid.nullable(),
  firstLaunchAt: Iso8601,
  updatedAt: Iso8601,
  defaultGamePresetId: z.string().min(1).optional(),
  lastBackupAt: Iso8601.optional()
});

export type AppSettings = z.infer<typeof AppSettings>;

export const AppSettingsPatch = AppSettings.partial().omit({
  schemaVersion: true,
  id: true
});

export type AppSettingsPatch = z.infer<typeof AppSettingsPatch>;
