import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { StorageProvider } from '@/app/providers/StorageProvider';
import { newId } from '@/domain/ids';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas';
import type { GameEvent, Session } from '@/domain/types';
import { useFilteredSessionStats } from '@/hooks/useFilteredSessionStats';
import type { StatsFilter } from '@/stats/filter';
import { DartTrainerDB, DexieStorageAdapter } from '@/storage/dexie';

function makeAdapter() {
  const db = new DartTrainerDB(`test_${Math.random().toString(36).slice(2)}`);
  return new DexieStorageAdapter({ db, appVersion: '0.0.0-test' });
}

function makeWrapper(adapter: DexieStorageAdapter) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <StorageProvider adapter={adapter}>{children}</StorageProvider>;
  };
}

async function seed(adapter: DexieStorageAdapter, profileId: string, startedAt: string) {
  const session = await adapter.createSession({
    gameModeId: 'cricket',
    gameConfig: { legsToWin: 1 },
    participants: [profileId],
    startedAt
  });
  const event: GameEvent = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: newId(),
    sessionId: session.id,
    seq: 0,
    type: 'note',
    payload: { text: 'x' },
    timestamp: startedAt
  };
  await adapter.appendEvent(event);
  await adapter.updateSessionStatus(session.id, 'completed');
  return session;
}

const countOne = (_events: GameEvent[], session: Session) => ({ startedAt: session.startedAt });

function renderFiltered(adapter: DexieStorageAdapter, profileId: string, filter: StatsFilter) {
  return renderHook(
    () => useFilteredSessionStats('cricket', profileId, filter, countOne),
    { wrapper: makeWrapper(adapter) }
  );
}

describe('useFilteredSessionStats', () => {
  it('slices to the trailing N sessions, newest first', async () => {
    const adapter = makeAdapter();
    await adapter.init();
    const profile = await adapter.createProfile({ name: 'P1' });
    for (let m = 1; m <= 6; m++) {
      await seed(adapter, profile.id, `2025-0${m}-01T10:00:00.000Z`);
    }

    const { result } = renderFiltered(adapter, profile.id, { kind: 'lastN', n: 5 });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.pairs).toHaveLength(5);
    expect(result.current.pairs[0]!.stats.startedAt).toBe('2025-06-01T10:00:00.000Z');
    expect(result.current.pairs.some((p) => p.stats.startedAt === '2025-01-01T10:00:00.000Z')).toBe(false);
  });

  it('applies a custom date range', async () => {
    const adapter = makeAdapter();
    await adapter.init();
    const profile = await adapter.createProfile({ name: 'P1' });
    await seed(adapter, profile.id, '2025-01-15T10:00:00.000Z');
    await seed(adapter, profile.id, '2025-03-15T10:00:00.000Z');
    await seed(adapter, profile.id, '2025-09-15T10:00:00.000Z');

    const { result } = renderFiltered(adapter, profile.id, {
      kind: 'range',
      since: '2025-02-01',
      until: '2025-06-30'
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.pairs).toHaveLength(1);
    expect(result.current.pairs[0]!.stats.startedAt).toBe('2025-03-15T10:00:00.000Z');
  });

  it('returns all sessions for the all-time filter', async () => {
    const adapter = makeAdapter();
    await adapter.init();
    const profile = await adapter.createProfile({ name: 'P1' });
    await seed(adapter, profile.id, '2025-01-15T10:00:00.000Z');
    await seed(adapter, profile.id, '2025-03-15T10:00:00.000Z');

    const { result } = renderFiltered(adapter, profile.id, { kind: 'all' });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.pairs).toHaveLength(2);
  });
});
