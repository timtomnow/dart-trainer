import type { DartTrainerDB } from '../db';
import { migrateToV1 } from './v1';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas/common';

export type Migration = (db: DartTrainerDB) => Promise<void>;

export const MIGRATION_REGISTRY: Readonly<Record<number, Migration>> = {
  1: migrateToV1
};

export async function runMigrations(
  db: DartTrainerDB,
  targetVersion: number = CURRENT_SCHEMA_VERSION
): Promise<void> {
  if (!Number.isInteger(targetVersion) || targetVersion < 1) {
    throw new Error(`Invalid target schema version: ${targetVersion}`);
  }
  if (targetVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Target schema version ${targetVersion} is newer than known max ${CURRENT_SCHEMA_VERSION}`
    );
  }
  for (let v = 1; v <= targetVersion; v += 1) {
    const migrate = MIGRATION_REGISTRY[v];
    if (!migrate) {
      throw new Error(`Missing migration for schema version ${v}`);
    }
    await migrate(db);
  }
}
