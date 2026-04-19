import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStorage } from '@/app/providers/StorageProvider';
import { newId as defaultNewId } from '@/domain/ids';
import type { GameEvent, Session, SessionStatus } from '@/domain/types';
import type { EngineSeeds, GameEngine } from '@/games/engine';
import { getEngine } from '@/games/registry';

type AnyEngine = GameEngine<unknown, unknown, unknown, unknown>;

export type UseActiveSessionResult<TViewModel, TAction> = {
  session: Session | null;
  events: GameEvent[];
  view: TViewModel | null;
  isReady: boolean;
  error: Error | null;
  dispatch: (action: TAction) => Promise<void>;
  undo: () => Promise<void>;
  forfeit: (participantId: string) => Promise<void>;
};

type SessionDeps = {
  now?: () => string;
  newId?: () => string;
};

export function useActiveSession<TViewModel = unknown, TAction = unknown>(
  sessionId: string | null,
  deps: SessionDeps = {}
): UseActiveSessionResult<TViewModel, TAction> {
  const adapter = useStorage();
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const seeds = useMemo<EngineSeeds>(
    () => ({
      now: deps.now ?? (() => new Date().toISOString()),
      newId: deps.newId ?? defaultNewId
    }),
    [deps.now, deps.newId]
  );

  const engine = useMemo<AnyEngine | null>(
    () => (session ? getEngine(session.gameModeId) : null),
    [session]
  );

  const reload = useCallback(
    async (id: string) => {
      const next = await adapter.getSession(id);
      const nextEvents = next ? await adapter.listEvents(id) : [];
      setSession(next);
      setEvents(nextEvents);
      return { session: next, events: nextEvents };
    },
    [adapter]
  );

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setEvents([]);
      setIsReady(false);
      return;
    }
    let cancelled = false;
    setIsReady(false);
    setError(null);
    (async () => {
      try {
        await reload(sessionId);
        if (!cancelled) setIsReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, reload]);

  const state = useMemo(() => {
    if (!session || !engine) return null;
    return engine.replay(events, session.gameConfig, session.participants, session.id);
  }, [engine, session, events]);

  const view = useMemo<TViewModel | null>(() => {
    if (!engine || state === null) return null;
    return engine.view(state) as TViewModel;
  }, [engine, state]);

  const runAction = useCallback(
    async (action: unknown) => {
      if (!engine || !session || state === null) {
        throw new Error('Session is not ready.');
      }
      const result = engine.reduce(state, action, seeds);
      if (result.error) throw new Error(`${result.error.code}: ${result.error.message}`);
      for (const id of result.pop) {
        const popped = await adapter.popLastInputEvent(session.id);
        if (!popped || popped.id !== id) {
          await reload(session.id);
          throw new Error(
            `Undo mismatch: expected ${id}, got ${popped ? popped.id : 'nothing'}.`
          );
        }
      }
      for (const event of result.emit) {
        await adapter.appendEvent(event);
      }
      const derivedStatus = engine.isSessionOver(result.state)?.status ?? 'in_progress';
      const targetStatus: SessionStatus = derivedStatus;
      if (session.status !== targetStatus) {
        await adapter.updateSessionStatus(session.id, targetStatus);
      }
      await reload(session.id);
    },
    [adapter, engine, reload, seeds, session, state]
  );

  const dispatch = useCallback(
    async (action: TAction) => {
      await runAction(action);
    },
    [runAction]
  );

  const undo = useCallback(async () => {
    await runAction({ type: 'undo' });
  }, [runAction]);

  const forfeit = useCallback(
    async (participantId: string) => {
      await runAction({ type: 'forfeit', participantId });
    },
    [runAction]
  );

  return { session, events, view, isReady, error, dispatch, undo, forfeit };
}
