import { useCallback } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { CheckoutView } from './checkout/CheckoutView';
import { CricketView } from './cricket/CricketView';
import { FreeformView } from './freeform/FreeformView';
import { RtwView } from './rtw/RtwView';
import { RtwScoringView } from './rtw-scoring/RtwScoringView';
import { X01View } from './x01/X01View';
import type { CheckoutAction, CheckoutViewModel } from '@/games/checkout';
import type { CricketAction, CricketViewModel } from '@/games/cricket';
import type { FreeformAction, FreeformViewModel } from '@/games/freeform';
import type { RtwAction, RtwViewModel } from '@/games/rtw';
import type { RtwScoringAction, RtwScoringViewModel } from '@/games/rtw-scoring';
import type { X01Action, X01ViewModel } from '@/games/x01';
import { useActiveSession, useSessions } from '@/hooks';

export function GameScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { session, events, view, isReady, error, dispatch, undo, forfeit } =
    useActiveSession<unknown, unknown>(sessionId ?? null);
  const { create } = useSessions();

  const handlePlayAgain = useCallback(async () => {
    if (!session) return;
    const next = await create({
      gameModeId: session.gameModeId,
      gameConfig: session.gameConfig,
      participants: session.participants
    });
    navigate(`/game/${next.id}`);
  }, [create, navigate, session]);

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
        view={view as X01ViewModel}
        dispatch={dispatch as (a: X01Action) => Promise<void>}
        undo={undo}
        forfeit={forfeit}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (session.gameModeId === 'cricket') {
    return (
      <CricketView
        view={view as CricketViewModel}
        dispatch={dispatch as (a: CricketAction) => Promise<void>}
        undo={undo}
        forfeit={forfeit}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (session.gameModeId === 'rtw') {
    return (
      <RtwView
        view={view as RtwViewModel}
        dispatch={dispatch as (a: RtwAction) => Promise<void>}
        undo={undo}
        forfeit={forfeit}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (session.gameModeId === 'rtw-scoring') {
    return (
      <RtwScoringView
        view={view as RtwScoringViewModel}
        dispatch={dispatch as (a: RtwScoringAction) => Promise<void>}
        undo={undo}
        forfeit={forfeit}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  if (session.gameModeId === 'checkout') {
    return (
      <CheckoutView
        view={view as CheckoutViewModel}
        dispatch={dispatch as (a: CheckoutAction) => Promise<void>}
        undo={undo}
        forfeit={forfeit}
        onPlayAgain={handlePlayAgain}
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
