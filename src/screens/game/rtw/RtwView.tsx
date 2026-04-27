import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RtwKeypad } from './RtwKeypad';
import type { RtwAction, RtwViewModel } from '@/games/rtw';

type Props = {
  view: RtwViewModel;
  dispatch: (action: RtwAction) => Promise<void>;
  undo: () => Promise<void>;
  forfeit: (participantId: string) => Promise<void>;
  onPlayAgain: () => Promise<void>;
  participantNames?: Record<string, string>;
};

function DartDots({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Dart ${filled + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-3 w-3 rounded-full border-2 ${
            i < filled
              ? 'border-blue-600 bg-blue-600'
              : 'border-slate-400 bg-transparent'
          }`}
        />
      ))}
    </div>
  );
}

export function RtwView({ view, dispatch, undo, forfeit, onPlayAgain, participantNames }: Props) {
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const [sessionDone, setSessionDone] = useState(false);

  const prevStatusRef = useRef(view.status);
  useEffect(() => {
    if (view.status !== 'in_progress' && prevStatusRef.current === 'in_progress') {
      setSessionDone(true);
    } else if (view.status === 'in_progress' && prevStatusRef.current !== 'in_progress') {
      setSessionDone(false);
    }
    prevStatusRef.current = view.status;
  }, [view.status]);

  const run = async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const onGroupA = (hit: boolean) =>
    run(() =>
      dispatch({ type: 'throw', participantId: view.activeParticipantId, hit })
    );

  const onGroupB = (hitsInTurn: 0 | 1 | 2 | 3) =>
    run(() =>
      dispatch({ type: 'throw', participantId: view.activeParticipantId, hitsInTurn })
    );

  const isOver = view.status !== 'in_progress';
  const isGroupA = view.config.mode === 'Hit once' || view.config.mode === '1-dart per target';
  const isMulti = view.participantIds.length > 1;
  const activeName = isMulti
    ? (participantNames?.[view.activeParticipantId] ?? view.activeParticipantId)
    : null;

  const nextTargets = view.targetSequence.slice(
    view.currentTargetIndex + 1,
    view.currentTargetIndex + 4
  ).map((v) => (v === 25 ? 'Bull' : String(v)));

  const hitRate =
    view.totalDarts > 0
      ? Math.round((view.targetsHit / view.totalDarts) * 100)
      : null;

  return (
    <section className="mx-auto max-w-xl pb-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Round the World</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400" data-testid="rtw-progress">
          {view.currentTargetIndex}/{view.targetsTotal}
        </span>
      </div>

      {activeName && !isOver && (
        <div className="mt-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300" data-testid="rtw-active-player">
          {activeName}
        </div>
      )}

      {/* Current target */}
      <div className="mt-2 rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
        {isOver ? (
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {view.status === 'completed' ? 'Completed' : 'Forfeited'}
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums" data-testid="rtw-target">
              {view.status === 'completed' ? view.targetsTotal : view.currentTargetIndex}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              targets hit: {view.targetsHit}/{view.targetsTotal}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Current target
            </p>
            <p className="mt-1 text-6xl font-bold tabular-nums text-blue-600 dark:text-blue-400" data-testid="rtw-target">
              {view.currentTarget === 25 ? 'Bull' : view.currentTarget}
            </p>
            {isGroupA && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <DartDots filled={view.dartsInCurrentTurn} total={view.dartsPerTurn} />
              </div>
            )}
            {nextTargets.length > 0 && (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Next: {nextTargets.join(' → ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats strip */}
      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm dark:bg-slate-800/60" data-testid="rtw-stats">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Targets hit</dt>
          <dd className="font-semibold tabular-nums" data-testid="rtw-targets-hit">
            {view.targetsHit}/{view.targetsTotal}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Hit rate</dt>
          <dd className="font-semibold tabular-nums" data-testid="rtw-hit-rate">
            {hitRate !== null ? `${hitRate}%` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Darts</dt>
          <dd className="font-semibold tabular-nums" data-testid="rtw-darts">
            {view.totalDarts}
          </dd>
        </div>
      </dl>

      <RtwKeypad
        mode={view.config.mode}
        onGroupA={onGroupA}
        onGroupB={onGroupB}
        disabled={isOver}
      />

      {!sessionDone && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => run(undo)}
            disabled={!view.canUndo}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="rtw-undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => run(() => forfeit(view.activeParticipantId))}
            disabled={isOver}
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            data-testid="rtw-forfeit"
          >
            Forfeit
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="rtw-quit"
          >
            Quit
          </button>
        </div>
      )}

      {actionError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {sessionDone && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" data-testid="rtw-end-modal">
          <h2 className="text-lg font-semibold">
            {view.status === 'completed' ? 'Round the World complete!' : 'Session ended'}
          </h2>
          {isMulti && view.participantTargetIndices ? (
            <div className="mt-3 space-y-2">
              {view.participantIds.map((pid) => {
                const idx = view.participantTargetIndices![pid] ?? 0;
                const name = participantNames?.[pid] ?? pid;
                const isWinner = pid === view.winnerParticipantId;
                return (
                  <div key={pid} className={`flex items-center justify-between rounded-lg p-2 text-sm ${isWinner ? 'bg-blue-50 dark:bg-blue-950' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
                    <span className="font-medium">{name}{isWinner ? ' (winner)' : ''}</span>
                    <span className="tabular-nums">{idx}/{view.targetsTotal}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Targets hit</dt>
                <dd className="font-semibold">{view.targetsHit}/{view.targetsTotal}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Total darts</dt>
                <dd className="font-semibold">{view.totalDarts}</dd>
              </div>
            </dl>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => run(onPlayAgain)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              data-testid="rtw-play-again"
            >
              Play again
            </button>
            {view.canUndo && (
              <button
                type="button"
                onClick={() => run(undo)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
                data-testid="rtw-undo-end"
              >
                Undo last
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
              data-testid="rtw-end-session"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
