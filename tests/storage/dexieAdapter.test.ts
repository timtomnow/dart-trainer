import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas';
import type { AppSettings, PlayerProfile } from '@/domain/types';
import { DartTrainerDB, DexieStorageAdapter } from '@/storage/dexie';

const FIXED_IDS = [
  '01JARVQZAAAAAAAAAAAAAAAAAA',
  '01JARVQZBBBBBBBBBBBBBBBBBB',
  '01JARVQZCCCCCCCCCCCCCCCCCC',
  '01JARVQZDDDDDDDDDDDDDDDDDD',
  '01JARVQZEEEEEEEEEEEEEEEEEE'
];

function makeAdapter() {
  const db = new DartTrainerDB(`test_${Math.random().toString(36).slice(2)}`);
  const issued: string[] = [];
  let i = 0;
  const adapter = new DexieStorageAdapter({
    db,
    now: () => new Date('2026-04-18T12:00:00.000Z'),
    newId: () => {
      const id = FIXED_IDS[i++];
      if (!id) throw new Error('ran out of fake ids');
      issued.push(id);
      return id;
    },
    appVersion: '0.0.0-test'
  });
  return { db, adapter, issued };
}

describe('DexieStorageAdapter', () => {
  let db: DartTrainerDB;
  let adapter: DexieStorageAdapter;

  beforeEach(async () => {
    ({ db, adapter } = makeAdapter());
    await adapter.init();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('creates an appSettings singleton on init with schemaVersion and firstLaunchAt', async () => {
    const settings = await adapter.getAppSettings();
    expect(settings).not.toBeNull();
    expect(settings?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(settings?.id).toBe('app');
    expect(settings?.activeProfileId).toBeNull();
    expect(settings?.firstLaunchAt).toBe('2026-04-18T12:00:00.000Z');
  });

  it('creates a profile, stamps schemaVersion, and auto-activates the first one', async () => {
    const profile = await adapter.createProfile({ name: 'Tom' });
    expect(profile.name).toBe('Tom');
    expect(profile.archived).toBe(false);
    expect(profile.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const settings = await adapter.getAppSettings();
    expect(settings?.activeProfileId).toBe(profile.id);
  });

  it('does not auto-activate a second profile', async () => {
    const first = await adapter.createProfile({ name: 'Tom' });
    const second = await adapter.createProfile({ name: 'Jane' });
    const settings = await adapter.getAppSettings();
    expect(settings?.activeProfileId).toBe(first.id);
    expect(second.id).not.toBe(first.id);
  });

  it('renames a profile and updates updatedAt', async () => {
    const p = await adapter.createProfile({ name: 'Tom' });
    const renamed = await adapter.renameProfile(p.id, 'Thomas');
    expect(renamed.name).toBe('Thomas');
    expect(renamed.id).toBe(p.id);
  });

  it('rejects empty rename', async () => {
    const p = await adapter.createProfile({ name: 'Tom' });
    await expect(adapter.renameProfile(p.id, '   ')).rejects.toThrow();
  });

  it('archives a profile and clears active when it was active', async () => {
    const p = await adapter.createProfile({ name: 'Tom' });
    const archived = await adapter.archiveProfile(p.id);
    expect(archived.archived).toBe(true);
    const settings = await adapter.getAppSettings();
    expect(settings?.activeProfileId).toBeNull();
  });

  it('restores an archived profile', async () => {
    const p = await adapter.createProfile({ name: 'Tom' });
    await adapter.archiveProfile(p.id);
    const restored = await adapter.restoreProfile(p.id);
    expect(restored.archived).toBe(false);
  });

  it('listProfiles filters archived by default', async () => {
    const a = await adapter.createProfile({ name: 'A' });
    const b = await adapter.createProfile({ name: 'B' });
    await adapter.archiveProfile(b.id);
    const visible = await adapter.listProfiles();
    expect(visible.map((p) => p.id)).toEqual([a.id]);
    const all = await adapter.listProfiles({ includeArchived: true });
    expect(all).toHaveLength(2);
  });

  it('refuses to activate an archived profile', async () => {
    const a = await adapter.createProfile({ name: 'A' });
    await adapter.archiveProfile(a.id);
    await expect(adapter.setActiveProfile(a.id)).rejects.toThrow();
  });

  it('refuses to activate an unknown profile id', async () => {
    const unknownId = FIXED_IDS[4]!;
    await expect(adapter.setActiveProfile(unknownId)).rejects.toThrow();
  });

  it('notifies subscribers on profile changes', async () => {
    const events: PlayerProfile[][] = [];
    const unsub = adapter.subscribeProfiles((next) => events.push(next));
    await adapter.createProfile({ name: 'Tom' });
    await adapter.createProfile({ name: 'Jane' });
    unsub();
    // initial snapshot + 2 mutations
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events[events.length - 1]).toHaveLength(2);
  });

  it('notifies active-profile subscribers on setActiveProfile', async () => {
    const seen: (PlayerProfile | null)[] = [];
    const unsub = adapter.subscribeActiveProfile((p) => seen.push(p));
    const first = await adapter.createProfile({ name: 'Tom' });
    const second = await adapter.createProfile({ name: 'Jane' });
    await adapter.setActiveProfile(second.id);
    unsub();
    const ids = seen.map((p) => p?.id ?? null);
    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
  });

  it('notifies appSettings subscribers on updates', async () => {
    const seen: (AppSettings | null)[] = [];
    const unsub = adapter.subscribeAppSettings((s) => seen.push(s));
    await adapter.updateAppSettings({ lastBackupAt: '2026-04-18T13:00:00.000Z' });
    unsub();
    expect(seen[seen.length - 1]?.lastBackupAt).toBe('2026-04-18T13:00:00.000Z');
  });

  it('rejects a row with an invalid schemaVersion on read', async () => {
    const p = await adapter.createProfile({ name: 'Tom' });
    await db.profiles.put({ ...p, schemaVersion: 99 } as unknown as PlayerProfile);
    await expect(adapter.getProfile(p.id)).rejects.toThrow();
  });
});
