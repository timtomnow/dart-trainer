import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildManifest, computeContentHash } from '@/backup/manifest';
import { applyManifest, importBackup, validateBackupFile } from '@/backup/import';
import { DartTrainerDB, DexieStorageAdapter } from '@/storage/dexie';
import type { BackupManifest } from '@/domain/types';

function makeAdapter() {
  const db = new DartTrainerDB(`backup_test_${Math.random().toString(36).slice(2)}`);
  const adapter = new DexieStorageAdapter({
    db,
    now: () => new Date('2026-04-19T10:00:00.000Z'),
    newId: (() => {
      const ids = [
        '01JARVQZAAAAAAAAAAAAAAAAAA',
        '01JARVQZBBBBBBBBBBBBBBBBBB',
        '01JARVQZCCCCCCCCCCCCCCCCCC',
        '01JARVQZDDDDDDDDDDDDDDDDDD',
        '01JARVQZEEEEEEEEEEEEEEEEEE',
        '01JARVQZFFFFFFFFFFFFFFFFFFFA',
        '01JARVQZGGGGGGGGGGGGGGGGGG'
      ];
      let i = 0;
      return () => {
        const id = ids[i++];
        if (!id) throw new Error('Ran out of fake IDs');
        return id;
      };
    })(),
    appVersion: '0.0.0-test'
  });
  return { db, adapter };
}

function makeFile(content: string, name = 'backup.json'): File {
  return new File([content], name, { type: 'application/json' });
}

describe('backup roundtrip', () => {
  let sourceDb: DartTrainerDB;
  let sourceAdapter: DexieStorageAdapter;
  let targetDb: DartTrainerDB;
  let targetAdapter: DexieStorageAdapter;

  beforeEach(async () => {
    ({ db: sourceDb, adapter: sourceAdapter } = makeAdapter());
    ({ db: targetDb, adapter: targetAdapter } = makeAdapter());
    await sourceAdapter.init();
    await targetAdapter.init();
  });

  afterEach(async () => {
    await sourceDb.delete();
    await targetDb.delete();
  });

  it('exports and imports all profiles, sessions, and events into a fresh DB', async () => {
    const profile = await sourceAdapter.createProfile({ name: 'Tom' });
    const session = await sourceAdapter.createSession({
      gameModeId: 'x01',
      gameConfig: { startScore: 501 },
      participants: [profile.id]
    });
    const event = await sourceAdapter.appendEvent({
      schemaVersion: 1,
      id: '01JARVQZCCCCCCCCCCCCCCCCCC',
      sessionId: session.id,
      seq: 0,
      type: 'throw',
      payload: { segment: 'T', value: 20, profileId: profile.id, dartIndex: 0 },
      timestamp: '2026-04-19T10:01:00.000Z'
    });

    const manifest = await buildManifest(sourceAdapter, '0.0.0-test');
    const result = await applyManifest(manifest, targetAdapter);

    expect(result.profiles).toBe(1);
    expect(result.sessions).toBe(1);
    expect(result.events).toBe(1);

    const importedProfile = await targetAdapter.getProfile(profile.id);
    expect(importedProfile?.name).toBe('Tom');

    const importedSession = await targetAdapter.getSession(session.id);
    expect(importedSession?.gameModeId).toBe('x01');

    const importedEvents = await targetAdapter.listEvents(session.id);
    expect(importedEvents).toHaveLength(1);
    expect(importedEvents[0]?.id).toBe(event.id);
  });

  it('does not include deleted sessions in the export', async () => {
    const profile = await sourceAdapter.createProfile({ name: 'Jane' });
    const session = await sourceAdapter.createSession({
      gameModeId: 'x01',
      gameConfig: {},
      participants: [profile.id]
    });
    await sourceAdapter.deleteSession(session.id);

    const manifest = await buildManifest(sourceAdapter, '0.0.0-test');
    expect(manifest.counts.sessions).toBe(0);
    expect(manifest.data.sessions).toHaveLength(0);
  });
});

describe('fixture import (v1.json)', () => {
  let db: DartTrainerDB;
  let adapter: DexieStorageAdapter;

  beforeEach(async () => {
    ({ db, adapter } = makeAdapter());
    await adapter.init();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('imports the v1 fixture after computing the correct hash', async () => {
    const fixturePath = join(__dirname, '../fixtures/backups/v1.json');
    const raw = JSON.parse(readFileSync(fixturePath, 'utf-8')) as BackupManifest & { contentHash: string };

    const correctHash = await computeContentHash(raw.data);
    const patched = { ...raw, contentHash: correctHash };
    const file = makeFile(JSON.stringify(patched));

    const result = await importBackup(file, adapter);

    expect(result.profiles).toBe(1);
    expect(result.sessions).toBe(0);
    expect(result.events).toBe(0);

    const profiles = await adapter.listProfiles({ includeArchived: true });
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.name).toBe('Alice');
  });
});

describe('content hash tamper detection', () => {
  let db: DartTrainerDB;
  let adapter: DexieStorageAdapter;

  beforeEach(async () => {
    ({ db, adapter } = makeAdapter());
    await adapter.init();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('rejects a backup where the data has been modified after export', async () => {
    const profile = await adapter.createProfile({ name: 'Original' });
    const manifest = await buildManifest(adapter, '0.0.0-test');

    const tampered = JSON.parse(JSON.stringify(manifest)) as BackupManifest;
    tampered.data.profiles[0] = { ...tampered.data.profiles[0]!, name: 'Tampered' } as typeof tampered.data.profiles[0];

    const file = makeFile(JSON.stringify(tampered));
    await expect(validateBackupFile(file)).rejects.toThrow('content hash mismatch');
    void profile;
  });
});

describe('referential integrity checks', () => {
  let db: DartTrainerDB;
  let adapter: DexieStorageAdapter;

  beforeEach(async () => {
    ({ db, adapter } = makeAdapter());
    await adapter.init();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('rejects a manifest where an event references a non-existent session', async () => {
    const profile = await adapter.createProfile({ name: 'Test' });
    const manifest = await buildManifest(adapter, '0.0.0-test');

    const bad = JSON.parse(JSON.stringify(manifest)) as BackupManifest;
    bad.data.events = [
      {
        schemaVersion: 1,
        id: '01JARVQZAAAAAAAAAAAAAAAAAA',
        sessionId: '01JARVQZXXXXXXXXXXXXXXXX01',
        seq: 0,
        type: 'throw',
        payload: {},
        timestamp: '2026-04-19T10:00:00.000Z'
      }
    ];
    bad.counts.events = 1;
    bad.contentHash = await computeContentHash(bad.data);

    const file = makeFile(JSON.stringify(bad));
    await expect(validateBackupFile(file)).rejects.toThrow('unknown session');
    void profile;
  });

  it('rejects a manifest where a session references a non-existent profile', async () => {
    const profile = await adapter.createProfile({ name: 'Test' });
    const session = await adapter.createSession({
      gameModeId: 'x01',
      gameConfig: {},
      participants: [profile.id]
    });
    const manifest = await buildManifest(adapter, '0.0.0-test');

    const bad = JSON.parse(JSON.stringify(manifest)) as BackupManifest;
    bad.data.sessions[0] = {
      ...bad.data.sessions[0]!,
      participants: ['01JARVQZXXXXXXXXXXXXXXXX02']
    };
    bad.contentHash = await computeContentHash(bad.data);

    const file = makeFile(JSON.stringify(bad));
    await expect(validateBackupFile(file)).rejects.toThrow('unknown profile');
    void session;
  });
});
