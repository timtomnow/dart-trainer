import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas';
import type { GameEvent } from '@/domain/types';
import { DartTrainerDB, DexieStorageAdapter } from '@/storage/dexie';

const VALID_IDS = [
  '01JARVQZ11111111111111AAAA',
  '01JARVQZ22222222222222BBBB',
  '01JARVQZ33333333333333CCCC',
  '01JARVQZ44444444444444DDDD',
  '01JARVQZ55555555555555EEEE',
  '01JARVQZ66666666666666FFFF',
  '01JARVQZ77777777777777GGGG',
  '01JARVQZ88888888888888HHHH',
  '01JARVQZ99999999999999JJJJ',
  '01JARVQZAAAAAAAAAAAAAAKKKK',
  '01JARVQZBBBBBBBBBBBBBBMMMM',
  '01JARVQZCCCCCCCCCCCCCCNNNN'
];

function makeAdapter() {
  const db = new DartTrainerDB(`test_${Math.random().toString(36).slice(2)}`);
  let i = 0;
  const adapter = new DexieStorageAdapter({
    db,
    now: () => new Date('2026-04-18T12:00:00.000Z'),
    newId: () => {
      const id = VALID_IDS[i++];
      if (!id) throw new Error('ran out of fake ids');
      return id;
    },
    appVersion: '0.0.0-test'
  });
  return { db, adapter };
}

function makeEvent(
  sessionId: string,
  id: string,
  seq: number,
  type: GameEvent['type'] = 'throw',
  payload: unknown = { segment: 'S', value: 20, dartIndex: 0, participantId: sessionId }
): GameEvent {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    sessionId,
    seq,
    type,
    payload,
    timestamp: '2026-04-18T12:00:00.000Z'
  };
}

describe('DexieStorageAdapter sessions & events', () => {
  let db: DartTrainerDB;
  let adapter: DexieStorageAdapter;

  beforeEach(async () => {
    ({ db, adapter } = makeAdapter());
    await adapter.init();
    await adapter.createProfile({ name: 'Tom' });
  });

  afterEach(async () => {
    await db.delete();
  });

  it('creates a session with status in_progress and assigns startedAt', async () => {
    const profile = (await adapter.listProfiles())[0]!;
    const session = await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    expect(session.status).toBe('in_progress');
    expect(session.gameModeId).toBe('freeform');
    expect(session.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(session.participants).toEqual([profile.id]);
    expect(session.startedAt).toBe('2026-04-18T12:00:00.000Z');
  });

  it('lists sessions filtered by status', async () => {
    const profile = (await adapter.listProfiles())[0]!;
    const a = await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    const b = await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    await adapter.updateSessionStatus(b.id, 'forfeited');
    const inProgress = await adapter.listSessions({ status: 'in_progress' });
    expect(inProgress.map((s) => s.id)).toEqual([a.id]);
    const forfeited = await adapter.listSessions({ status: 'forfeited' });
    expect(forfeited.map((s) => s.id)).toEqual([b.id]);
  });

  it('appendEvent assigns monotonic seq per session', async () => {
    const profile = (await adapter.listProfiles())[0]!;
    const s = await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    await adapter.appendEvent(makeEvent(s.id, VALID_IDS[5]!, 0));
    await adapter.appendEvent(makeEvent(s.id, VALID_IDS[6]!, 1));
    await adapter.appendEvent(makeEvent(s.id, VALID_IDS[7]!, 2));
    const events = await adapter.listEvents(s.id);
    expect(events.map((e) => e.seq)).toEqual([0, 1, 2]);
  });

  it('rejects a non-monotonic seq', async () => {
    const profile = (await adapter.listProfiles())[0]!;
    const s = await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    await adapter.appendEvent(makeEvent(s.id, VALID_IDS[5]!, 0));
    await expect(
      adapter.appendEvent(makeEvent(s.id, VALID_IDS[6]!, 5))
    ).rejects.toThrow(/monotonic/i);
  });

  it('popLastInputEvent removes the most recent throw/forfeit/note', async () => {
    const profile = (await adapter.listProfiles())[0]!;
    const s = await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    await adapter.appendEvent(makeEvent(s.id, VALID_IDS[5]!, 0, 'throw'));
    await adapter.appendEvent(makeEvent(s.id, VALID_IDS[6]!, 1, 'note', { text: 'hi' }));
    const popped = await adapter.popLastInputEvent(s.id);
    expect(popped?.id).toBe(VALID_IDS[6]);
    const remaining = await adapter.listEvents(s.id);
    expect(remaining.map((e) => e.id)).toEqual([VALID_IDS[5]]);
  });

  it('popLastInputEvent skips derived events and returns null when empty', async () => {
    const profile = (await adapter.listProfiles())[0]!;
    const s = await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    expect(await adapter.popLastInputEvent(s.id)).toBeNull();
  });

  it('deleteSession soft-deletes by setting status to deleted', async () => {
    const profile = (await adapter.listProfiles())[0]!;
    const s = await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    await adapter.deleteSession(s.id);
    const again = await adapter.getSession(s.id);
    expect(again?.status).toBe('deleted');
  });

  it('rejects events with invalid schemaVersion', async () => {
    const profile = (await adapter.listProfiles())[0]!;
    const s = await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    const bad = { ...makeEvent(s.id, VALID_IDS[5]!, 0), schemaVersion: 99 } as unknown as GameEvent;
    await expect(adapter.appendEvent(bad)).rejects.toThrow();
  });
});
