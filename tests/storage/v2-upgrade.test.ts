import { Dexie } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { DartTrainerDB, DB_CURRENT_VERSION, DexieStorageAdapter } from '@/storage/dexie';

describe('Dexie DB v1 → v2 upgrade', () => {
  // Note: DB_CURRENT_VERSION tracks the latest Dexie schema version (v3 as of M6).
  let db: DartTrainerDB | null = null;
  let legacyDb: Dexie | null = null;

  afterEach(async () => {
    if (db) {
      await db.delete();
      db = null;
    }
    if (legacyDb) {
      await legacyDb.delete();
      legacyDb = null;
    }
  });

  it('bumps DB_CURRENT_VERSION to 3', () => {
    expect(DB_CURRENT_VERSION).toBe(3);
  });

  it('opens an existing v1 database and exposes empty sessions, events, and derivedStats stores', async () => {
    const name = `upgrade_${Math.random().toString(36).slice(2)}`;

    legacyDb = new Dexie(name);
    legacyDb.version(1).stores({
      appSettings: 'id',
      profiles: 'id, name, archived, createdAt'
    });
    await legacyDb.open();
    await legacyDb.table('appSettings').put({
      schemaVersion: 1,
      id: 'app',
      appVersion: '0.0.0-test',
      activeProfileId: null,
      firstLaunchAt: '2026-04-18T12:00:00.000Z',
      updatedAt: '2026-04-18T12:00:00.000Z'
    });
    legacyDb.close();
    legacyDb = null;

    db = new DartTrainerDB(name);
    const adapter = new DexieStorageAdapter({ db, appVersion: '0.0.0-test' });
    await adapter.init();

    expect(db.verno).toBe(3);
    expect(await db.sessions.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
    expect(await db.derivedStats.count()).toBe(0);

    const settings = await adapter.getAppSettings();
    expect(settings?.firstLaunchAt).toBe('2026-04-18T12:00:00.000Z');
  });
});
