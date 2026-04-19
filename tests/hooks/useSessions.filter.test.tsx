import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { StorageProvider } from '@/app/providers/StorageProvider';
import { useSessions } from '@/hooks';
import { DartTrainerDB, DexieStorageAdapter } from '@/storage/dexie';

function makeAdapter(name?: string) {
  const db = new DartTrainerDB(name ?? `test_${Math.random().toString(36).slice(2)}`);
  const adapter = new DexieStorageAdapter({ db, appVersion: '0.0.0-test' });
  return adapter;
}

function makeWrapper(adapter: DexieStorageAdapter) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <StorageProvider adapter={adapter}>{children}</StorageProvider>;
  };
}

describe('useSessions filter: gameModeId', () => {
  it('returns only sessions matching the requested gameModeId', async () => {
    const adapter = makeAdapter();
    await adapter.init();
    const profile = await adapter.createProfile({ name: 'P1' });
    await adapter.createSession({
      gameModeId: 'x01',
      gameConfig: { startScore: 501, inRule: 'straight', outRule: 'double', legsToWin: 1 },
      participants: [profile.id]
    });
    await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id]
    });
    // Mark both as completed so they appear in history lists
    const all = await adapter.listSessions();
    for (const s of all) await adapter.updateSessionStatus(s.id, 'completed');

    const wrapper = makeWrapper(adapter);
    const { result } = renderHook(
      () => useSessions({ status: 'completed', gameModeId: 'x01' }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0]!.gameModeId).toBe('x01');
  });

  it('returns all modes when gameModeId is not set', async () => {
    const adapter = makeAdapter();
    await adapter.init();
    const profile = await adapter.createProfile({ name: 'P1' });
    await adapter.createSession({ gameModeId: 'x01', gameConfig: {}, participants: [profile.id] });
    await adapter.createSession({ gameModeId: 'freeform', gameConfig: {}, participants: [profile.id] });
    const all = await adapter.listSessions();
    for (const s of all) await adapter.updateSessionStatus(s.id, 'completed');

    const wrapper = makeWrapper(adapter);
    const { result } = renderHook(
      () => useSessions({ status: 'completed' }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions).toHaveLength(2);
  });
});

describe('useSessions filter: since / until', () => {
  it('filters sessions by since (ISO string lower bound)', async () => {
    const adapter = makeAdapter();
    await adapter.init();
    const profile = await adapter.createProfile({ name: 'P1' });

    // Create a session with a fixed startedAt in the past
    await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id],
      startedAt: '2025-01-01T10:00:00.000Z'
    });
    await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id],
      startedAt: '2025-06-01T10:00:00.000Z'
    });
    const all = await adapter.listSessions();
    for (const s of all) await adapter.updateSessionStatus(s.id, 'completed');

    const wrapper = makeWrapper(adapter);
    const { result } = renderHook(
      () => useSessions({ status: 'completed', since: '2025-03-01T00:00:00.000Z' }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0]!.startedAt).toBe('2025-06-01T10:00:00.000Z');
  });

  it('filters sessions by until (ISO string upper bound)', async () => {
    const adapter = makeAdapter();
    await adapter.init();
    const profile = await adapter.createProfile({ name: 'P1' });

    await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id],
      startedAt: '2025-01-01T10:00:00.000Z'
    });
    await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id],
      startedAt: '2025-12-01T10:00:00.000Z'
    });
    const all = await adapter.listSessions();
    for (const s of all) await adapter.updateSessionStatus(s.id, 'completed');

    const wrapper = makeWrapper(adapter);
    const { result } = renderHook(
      () => useSessions({ status: 'completed', until: '2025-06-01T00:00:00.000Z' }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0]!.startedAt).toBe('2025-01-01T10:00:00.000Z');
  });

  it('combines gameModeId + since + until', async () => {
    const adapter = makeAdapter();
    await adapter.init();
    const profile = await adapter.createProfile({ name: 'P1' });

    await adapter.createSession({
      gameModeId: 'x01',
      gameConfig: {},
      participants: [profile.id],
      startedAt: '2025-01-01T10:00:00.000Z'
    });
    await adapter.createSession({
      gameModeId: 'freeform',
      gameConfig: {},
      participants: [profile.id],
      startedAt: '2025-06-01T10:00:00.000Z'
    });
    await adapter.createSession({
      gameModeId: 'x01',
      gameConfig: {},
      participants: [profile.id],
      startedAt: '2025-09-01T10:00:00.000Z'
    });
    const all = await adapter.listSessions();
    for (const s of all) await adapter.updateSessionStatus(s.id, 'completed');

    const wrapper = makeWrapper(adapter);
    const { result } = renderHook(
      () => useSessions({
        status: 'completed',
        gameModeId: 'x01',
        since: '2025-05-01T00:00:00.000Z'
      }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Only the x01 session from 2025-09 should match (x01 + after May)
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0]!.startedAt).toBe('2025-09-01T10:00:00.000Z');
  });
});
