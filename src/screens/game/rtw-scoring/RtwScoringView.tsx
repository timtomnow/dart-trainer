import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RtwScoringKeypad } from './RtwScoringKeypad';
import type { ThrowSegment } from '@/domain/types';
import type { RtwScoringAction, RtwScoringViewModel } from '@/games/rtw-scoring';

type Props = {
  view: RtwScoringViewModel;
  dispatch: (action: RtwScoringAction) => Promise<void>;
  undo: () => Promise<void>;
  forfeit: (participantId: string) => Promise<void>;
  onPlayAgain: () => Promise<void>;
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

export function RtwScoringView({ view, dispatch, undo, forfeit, onPlayAgain }: Props) {
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

  const onDart = (segment: ThrowSegment, value: number) =>
    run(() =>
      dispatch({ type: 'throw', participantId: view.activeParticipantId, segment, value })
    );

  const isOver = view.status !== 'in_progress';
  const hasBull = view.targetSequence.includes(25);
  const hitRate =
    view.targetsHit > 0 && view.currentTargetIndex > 0
      ? Math.round((view.targetsHit / view.currentTargetIndex) * 100)
      : null;

  return (
    <section className="mx-auto max-w-xl pb-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">RTW Scoring</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400" data-testid="rtws-progress">
          {view.currentTargetIndex}/{view.targetsTotal}
        </span>
      </div>

      {/* Score + current target */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Score</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400" data-testid="rtws-score">
            {view.totalScore}
          </p>
          {view.currentTurnScore > 0 && (
            <p className="mt-0.5 text-sm text-slate-500" data-testid="rtws-turn-score">
              +{view.currentTurnScore} this turn
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isOver ? (view.status === 'completed' ? 'Completed' : 'Forfeited') : 'Target'}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-blue-600 dark:text-blue-400" data-testid="rtws-target">
            {isOver
              ? view.currentTargetIndex
              : view.currentTarget === 25
                ? 'Bull'
                : view.currentTarget}
          </p>
          {!isOver && (
            <div className="mt-2 flex justify-center">
              <DartDots filled={view.dartsInCurrentTurn} total={view.dartsPerTurn} />
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm dark:bg-slate-800/60" data-testid="rtws-stats">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Targets hit</dt>
          <dd className="font-semibold tabular-nums" data-testid="rtws-targets-hit">
            {view.targetsHit}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Hit rate</dt>
          <dd className="font-semibold tabular-nums" data-testid="rtws-hit-rate">
            {hitRate !== null ? `${hitRate}%` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Darts</dt>
          <dd className="font-semibold tabular-nums" data-testid="rtws-darts">
            {view.totalDarts}
          </dd>
        </div>
      </dl>

      <RtwScoringKeypad
        onDart={onDart}
        disabled={isOver}
        currentTarget={view.currentTarget}
        showBull={hasBull}
      />

      {!sessionDone && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => run(undo)}
            disabled={!view.canUndo}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="rtws-undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => run(() => forfeit(view.activeParticipantId))}
            disabled={isOver}
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            data-testid="rtws-forfeit"
          >
            Forfeit
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="rtws-quit"
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
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" data-testid="rtws-end-modal">
          <h2 className="text-lg font-semibold">
            {view.status === 'completed' ? 'RTW Scoring complete!' : 'Session ended'}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Final score</dt>
              <dd className="text-2xl font-bold text-emerald-600">{view.totalScore}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Targets hit</dt>
              <dd className="font-semibold">{view.targetsHit}/{view.targetsTotal}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Total darts</dt>
              <dd className="font-semibold">{view.totalDarts}</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => run(onPlayAgain)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              data-testid="rtws-play-again"
            >
              Play again
            </button>
            {view.canUndo && (
              <button
                type="button"
                onClick={() => run(undo)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
                data-testid="rtws-undo-end"
              >
                Undo last
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
              data-testid="rtws-end-session"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
