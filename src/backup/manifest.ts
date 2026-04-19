import { CURRENT_BACKUP_SCHEMA_VERSION } from './migrations';
import type { BackupData, BackupManifest } from '@/domain/types';
import type { StorageAdapter } from '@/storage/adapter';

function canonicalJson(val: unknown): string {
  return JSON.stringify(val, (_key, v: unknown) => {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as object).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return v;
  });
}

export async function computeContentHash(data: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(canonicalJson(data));
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildManifest(
  adapter: StorageAdapter,
  appVersion: string
): Promise<BackupManifest> {
  const settings = await adapter.getAppSettings();
  const profiles = await adapter.listProfiles({ includeArchived: true });
  const allSessions = await adapter.listSessions();
  const sessions = allSessions.filter((s) => s.status !== 'deleted');

  const eventArrays = await Promise.all(sessions.map((s) => adapter.listEvents(s.id)));
  const events = eventArrays.flat();

  const data: BackupData = {
    settings,
    profiles,
    profilePrefs: [],
    sessions,
    events,
    derivedStats: [],
    drills: []
  };

  const contentHash = await computeContentHash(data);

  return {
    schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    contentHash,
    counts: {
      profiles: profiles.length,
      profilePrefs: 0,
      sessions: sessions.length,
      events: events.length,
      derivedStats: 0,
      drills: 0
    },
    data
  };
}
