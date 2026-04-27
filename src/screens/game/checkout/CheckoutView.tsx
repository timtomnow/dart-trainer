import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckoutKeypad } from './CheckoutKeypad';
import type { ThrowSegment } from '@/domain/types';
import type { CheckoutAction, CheckoutAttempt, CheckoutViewModel } from '@/games/checkout';
import { RulesHelpButton } from '@/ui/help/RulesHelpButton';

type Props = {
  view: CheckoutViewModel;
  dispatch: (action: CheckoutAction) => Promise<void>;
  undo: () => Promise<void>;
  forfeit: (participantId: string) => Promise<void>;
  onPlayAgain: () => Promise<void>;
};

function DartDots({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`${filled} of ${total} darts thrown`}>
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

function AttemptRow({ attempt }: { attempt: CheckoutAttempt }) {
  const dartsStr =
    attempt.darts
      .map((d) => {
        if (d.segment === 'MISS') return 'Miss';
        if (d.segment === 'DB') return 'DB';
        if (d.segment === 'SB') return 'SB';
        return `${d.segment}${d.value}`;
      })
      .join(', ') || '—';

  return (
    <div
      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
        attempt.success
          ? 'bg-emerald-50 dark:bg-emerald-950/50'
          : 'bg-slate-50 dark:bg-slate-800/60'
      }`}
    >
      <span className="w-10 font-semibold tabular-nums">{attempt.targetFinish}</span>
      <span className="flex-1 truncate px-2 text-xs text-slate-500 dark:text-slate-400">
        {dartsStr}
      </span>
      <span
        className={`text-xs font-semibold ${
          attempt.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
        }`}
      >
        {attempt.success ? 'Hit' : `${attempt.remainingAtEnd} left`}
      </span>
    </div>
  );
}

export function CheckoutView({ view, dispatch, undo, forfeit, onPlayAgain }: Props) {
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
  const successRateDisplay =
    view.successRate !== null ? `${Math.round(view.successRate)}%` : '—';

  const recentAttempts = [...view.attempts].reverse().slice(0, 10);

  return (
    <section className="mx-auto max-w-xl pb-6">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold">Checkout Practice</h1>
          <RulesHelpButton gameId="checkout" />
        </div>
        <span
          className="text-sm text-slate-500 dark:text-slate-400"
          data-testid="checkout-progress"
        >
          {view.currentFinishIndex}/{view.totalFinishes}
        </span>
      </div>

      {/* Current finish card */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
        {isOver ? (
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {view.status === 'completed' ? 'Completed' : 'Forfeited'}
            </p>
            <p
              className="mt-1 text-5xl font-bold tabular-nums"
              data-testid="checkout-finish"
            >
              {view.successCount}/{view.totalAttemptsCompleted}
            </p>
            <p className="mt-1 text-sm text-slate-500">checkouts hit</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Finish — Attempt {view.currentAttempt} of {view.totalAttempts}
            </p>
            <p
              className="mt-1 text-6xl font-bold tabular-nums text-blue-600 dark:text-blue-400"
              data-testid="checkout-finish"
            >
              {view.currentFinish}
            </p>
            {view.dartsInCurrentAttempt > 0 && (
              <p
                className="mt-1 text-3xl font-semibold tabular-nums text-slate-700 dark:text-slate-300"
                data-testid="checkout-remaining"
              >
                {view.remainingInCurrentAttempt} remaining
              </p>
            )}
            <div className="mt-3 flex items-center justify-center">
              <DartDots filled={view.dartsInCurrentAttempt} total={3} />
            </div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <dl
        className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm dark:bg-slate-800/60"
        data-testid="checkout-stats"
      >
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Hit rate</dt>
          <dd className="font-semibold tabular-nums" data-testid="checkout-success-rate">
            {successRateDisplay}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Checkouts</dt>
          <dd className="font-semibold tabular-nums" data-testid="checkout-success-count">
            {view.successCount}/{view.totalAttemptsCompleted}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Attempts</dt>
          <dd className="font-semibold tabular-nums" data-testid="checkout-attempts">
            {view.totalAttemptsCompleted}
          </dd>
        </div>
      </dl>

      {/* Attempt history */}
      {recentAttempts.length > 0 && (
        <div className="mt-3 space-y-1 overflow-y-auto" data-testid="checkout-history">
          {recentAttempts.map((attempt, i) => (
            <AttemptRow
              key={`${attempt.finishIndex}-${attempt.attemptIndex}-${i}`}
              attempt={attempt}
            />
          ))}
        </div>
      )}

      {!sessionDone && (
        <CheckoutKeypad
          onDart={onDart}
          disabled={isOver}
          remainingInAttempt={view.remainingInCurrentAttempt}
          outRule={view.config.outRule}
        />
      )}

      {!sessionDone && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => run(undo)}
            disabled={!view.canUndo}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="checkout-undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => run(() => forfeit(view.activeParticipantId))}
            disabled={isOver}
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            data-testid="checkout-forfeit"
          >
            Forfeit
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="checkout-quit"
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
        <div
          className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
          data-testid="checkout-end-modal"
        >
          <h2 className="text-lg font-semibold">
            {view.status === 'completed' ? 'Checkout practice complete!' : 'Session ended'}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Checkouts hit</dt>
              <dd className="font-semibold">
                {view.successCount}/{view.totalAttemptsCompleted}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Hit rate</dt>
              <dd className="font-semibold">{successRateDisplay}</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => run(onPlayAgain)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              data-testid="checkout-play-again"
            >
              Play again
            </button>
            {view.canUndo && (
              <button
                type="button"
                onClick={() => run(undo)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
                data-testid="checkout-undo-end"
              >
                Undo last
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
              data-testid="checkout-end-session"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
