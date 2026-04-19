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

  const parsed = BackupManifest.safeParse({ ...(raw as object), data: migratedData });
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
