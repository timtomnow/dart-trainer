import { afterEach, describe, expect, it } from 'vitest';
import fixtureJson from '../fixtures/db/v1/snapshot.json';
import type { AppSettings, PlayerProfile } from '@/domain/types';
import { DartTrainerDB, DexieStorageAdapter } from '@/storage/dexie';

const fixture = fixtureJson as unknown as {
  appSettings: AppSettings[];
  profiles: PlayerProfile[];
};

describe('v1 fixture import', () => {
  let db: DartTrainerDB | null = null;

  afterEach(async () => {
    if (db) {
      await db.delete();
      db = null;
    }
  });

  it('loads a hand-written v1 snapshot into a fresh DB and matches counts', async () => {
    db = new DartTrainerDB(`fixture_${Math.random().toString(36).slice(2)}`);
    await db.open();
    await db.appSettings.bulkPut(fixture.appSettings);
    await db.profiles.bulkPut(fixture.profiles);

    const adapter = new DexieStorageAdapter({ db });
    await adapter.init();

    const all = await adapter.listProfiles({ includeArchived: true });
    expect(all).toHaveLength(fixture.profiles.length);

    const active = await adapter.listProfiles();
    const expectedActive = fixture.profiles.filter((p) => !p.archived).length;
    expect(active).toHaveLength(expectedActive);

    const firstSettings = fixture.appSettings[0]!;
    const settings = await adapter.getAppSettings();
    expect(settings?.activeProfileId).toBe(firstSettings.activeProfileId);
    expect(settings?.firstLaunchAt).toBe(firstSettings.firstLaunchAt);
  });
});
