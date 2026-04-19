import { Navigate, useParams } from 'react-router-dom';
import { FreeformView } from './freeform/FreeformView';
import { X01View } from './x01/X01View';
import type { FreeformAction, FreeformViewModel } from '@/games/freeform';
import type { X01Action, X01ViewModel } from '@/games/x01';
import { useActiveSession } from '@/hooks';

export function GameScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session, events, view, isReady, error, dispatch, undo, forfeit } =
    useActiveSession<unknown, unknown>(sessionId ?? null);

  if (!sessionId) return <Navigate to="/" replace />;
  if (error) {
    return (
      <section className="mx-auto max-w-3xl" role="alert">
        <h1 className="text-2xl font-semibold">Active Game</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </section>
    );
  }
  if (!isReady || !session || !view) {
    return (
      <section className="mx-auto max-w-3xl" aria-busy="true">
        <h1 className="text-2xl font-semibold">Active Game</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Loading…</p>
      </section>
    );
  }

  if (session.gameModeId === 'x01') {
    return (
      <X01View
        session={session}
        view={view as X01ViewModel}
        dispatch={dispatch as (a: X01Action) => Promise<void>}
        undo={undo}
        forfeit={forfeit}
      />
    );
  }

  return (
    <FreeformView
      session={session}
      events={events}
      view={view as FreeformViewModel}
      dispatch={dispatch as (a: FreeformAction) => Promise<void>}
      undo={undo}
      forfeit={forfeit}
    />
  );
}
