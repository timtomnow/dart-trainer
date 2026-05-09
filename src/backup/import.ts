import { z } from 'zod';
import { computeContentHash } from './manifest';
import { CURRENT_BACKUP_SCHEMA_VERSION, migrateBackupData } from './migrations';
import { BackupManifest } from '@/domain/schemas';
import type { BackupManifest as BackupManifestType } from '@/domain/types';
import type { StorageAdapter } from '@/storage/adapter';

export type ImportResult = {
  profiles: number;
  sessions: number;
  events: number;
};

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

const RawManifest = z.object({
  schemaVersion: z.number().int().positive(),
  contentHash: z.string().min(1),
  data: z.unknown()
});

const RETIRED_GAME_MODE_IDS = new Set<string>(['freeform']);

function stripUnsupportedGameModes(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const d = data as { sessions?: unknown[]; events?: unknown[] } & Record<string, unknown>;
  const sessions = Array.isArray(d.sessions) ? d.sessions : [];
  const events = Array.isArray(d.events) ? d.events : [];
  const retiredSessionIds = new Set<string>();
  const keptSessions = sessions.filter((s) => {
    const obj = s as { id?: unknown; gameModeId?: unknown };
    const gameModeId = typeof obj.gameModeId === 'string' ? obj.gameModeId : '';
    if (RETIRED_GAME_MODE_IDS.has(gameModeId)) {
      if (typeof obj.id === 'string') retiredSessionIds.add(obj.id);
      return false;
    }
    return true;
  });
  if (retiredSessionIds.size === 0) return data;
  const keptEvents = events.filter((e) => {
    const obj = e as { sessionId?: unknown };
    return typeof obj.sessionId !== 'string' || !retiredSessionIds.has(obj.sessionId);
  });
  return { ...d, sessions: keptSessions, events: keptEvents };
}

function recomputeBackupCounts(raw: unknown, cleanedData: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  if (!cleanedData || typeof cleanedData !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  const counts = (r.counts && typeof r.counts === 'object' ? r.counts : {}) as Record<string, unknown>;
  const d = cleanedData as { sessions?: unknown[]; events?: unknown[] };
  return {
    ...r,
    counts: {
      ...counts,
      sessions: Array.isArray(d.sessions) ? d.sessions.length : counts.sessions,
      events: Array.isArray(d.events) ? d.events.length : counts.events
    }
  };
}

export async function validateBackupFile(
  file: File
): Promise<{ manifest: BackupManifestType; counts: ImportResult }> {
  let text: string;
  try {
    text = await readFileAsText(file);
  } catch {
    throw new Error('Could not read the backup file.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('The file does not contain valid JSON.');
  }

  const loose = RawManifest.safeParse(raw);
  if (!loose.success) {
    throw new Error('The file is not a valid backup manifest (missing required fields).');
  }

  const { schemaVersion, contentHash, data } = loose.data;

  if (schemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `This backup requires app schema v${schemaVersion} but the current version is v${CURRENT_BACKUP_SCHEMA_VERSION}. Please update the app.`
    );
  }

  const expectedHash = await computeContentHash(data);
  if (contentHash !== expectedHash) {
    throw new Error(
      'The backup file appears to be corrupted or tampered with (content hash mismatch).'
    );
  }

  const migratedData = migrateBackupData(data, schemaVersion);
  const cleanedData = stripUnsupportedGameModes(migratedData);
  const cleanedRaw = recomputeBackupCounts(raw, cleanedData);

  const parsed = BackupManifest.safeParse({ ...(cleanedRaw as object), data: cleanedData });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`Backup validation failed: ${first?.message ?? 'unknown error'}`);
  }

  const manifest = parsed.data;

  const sessionIds = new Set(manifest.data.sessions.map((s) => s.id));
  for (const event of manifest.data.events) {
    if (!sessionIds.has(event.sessionId)) {
      throw new Error(
        `Backup contains an event referencing unknown session "${event.sessionId}".`
      );
    }
  }

  const profileIds = new Set(manifest.data.profiles.map((p) => p.id));
  for (const session of manifest.data.sessions) {
    for (const participantId of session.participants) {
      if (!profileIds.has(participantId)) {
        throw new Error(
          `Backup contains a session referencing unknown profile "${participantId}".`
        );
      }
    }
  }

  const counts: ImportResult = {
    profiles: manifest.counts.profiles,
    sessions: manifest.counts.sessions,
    events: manifest.counts.events
  };

  return { manifest, counts };
}

export async function applyManifest(
  manifest: BackupManifestType,
  adapter: StorageAdapter
): Promise<ImportResult> {
  await adapter.replaceAllData(manifest.data);
  return {
    profiles: manifest.counts.profiles,
    sessions: manifest.counts.sessions,
    events: manifest.counts.events
  };
}

export async function importBackup(file: File, adapter: StorageAdapter): Promise<ImportResult> {
  const { manifest } = await validateBackupFile(file);
  return applyManifest(manifest, adapter);
}
