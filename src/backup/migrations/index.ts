export const CURRENT_BACKUP_SCHEMA_VERSION = 1 as const;

type MigrationFn = (data: unknown) => unknown;

// Registry: key is the FROM version; value transforms data to FROM+1 format.
// Example for a future v1→v2 migration:
// registry.set(1, (data) => {
//   const d = data as Record<string, unknown>;
//   return { ...d, newField: [] };
// });
const registry = new Map<number, MigrationFn>();

export function migrateBackupData(rawData: unknown, fromVersion: number): unknown {
  let current = rawData;
  for (let v = fromVersion; v < CURRENT_BACKUP_SCHEMA_VERSION; v++) {
    const migrate = registry.get(v);
    if (!migrate) throw new Error(`No backup migration from schema v${v} to v${v + 1}.`);
    current = migrate(current);
  }
  return current;
}
