import { afterEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas';
import { DartTrainerDB, MIGRATION_REGISTRY, runMigrations } from '@/storage/dexie';

describe('migration runner', () => {
  let db: DartTrainerDB | null = null;

  afterEach(async () => {
    if (db) {
      await db.delete();
      db = null;
    }
  });

  it('registers a migration for each known schema version', () => {
    for (let v = 1; v <= CURRENT_SCHEMA_VERSION; v += 1) {
      expect(MIGRATION_REGISTRY[v]).toBeTypeOf('function');
    }
  });

  it('is a no-op at the current version', async () => {
    db = new DartTrainerDB(`mig_${Math.random().toString(36).slice(2)}`);
    await db.open();
    await expect(runMigrations(db, CURRENT_SCHEMA_VERSION)).resolves.toBeUndefined();
  });

  it('rejects a future schema version', async () => {
    db = new DartTrainerDB(`mig_${Math.random().toString(36).slice(2)}`);
    await db.open();
    await expect(runMigrations(db, CURRENT_SCHEMA_VERSION + 1)).rejects.toThrow();
  });

  it('rejects a non-positive schema version', async () => {
    db = new DartTrainerDB(`mig_${Math.random().toString(36).slice(2)}`);
    await db.open();
    await expect(runMigrations(db, 0)).rejects.toThrow();
  });
});
