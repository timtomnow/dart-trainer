import type { DartTrainerDB } from '../db';

export async function migrateToV1(db: DartTrainerDB): Promise<void> {
  // Purge sessions for the retired 'freeform' game mode along with their
  // events and any cached derived stats. Idempotent: a no-op once cleared.
  const freeformSessionIds = (
    await db.sessions.where('gameModeId').equals('freeform').toArray()
  ).map((s) => s.id);
  if (freeformSessionIds.length === 0) return;
  await db.transaction(
    'rw',
    [db.sessions, db.events, db.derivedStats],
    async () => {
      for (const id of freeformSessionIds) {
        const events = await db.events.where('sessionId').equals(id).toArray();
        if (events.length > 0) {
          await db.events.bulkDelete(events.map((e) => e.id));
        }
        await db.derivedStats.delete(['session', id]);
        await db.sessions.delete(id);
      }
    }
  );
}
