import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X01Keypad } from './X01Keypad';
import { X01LegEndModal } from './X01LegEndModal';
import { X01ScoreHeader } from './X01ScoreHeader';
import { X01SessionEndModal } from './X01SessionEndModal';
import { X01TurnStrip } from './X01TurnStrip';
import type { ThrowSegment } from '@/domain/types';
import type { X01Action, X01LegStats, X01ViewModel } from '@/games/x01';

type Props = {
  view: X01ViewModel;
  dispatch: (action: X01Action) => Promise<void>;
  undo: () => Promise<void>;
  forfeit: (participantId: string) => Promise<void>;
  onPlayAgain: () => Promise<void>;
};

type LegEndData = {
  completedLegNumber: number;
  legsWon: Record<string, number>;
  stats: X01LegStats;
};

type SessionEndData = {
  stats: X01LegStats;
};

function formatAvg(n: number): string {
  return n.toFixed(2);
}

function formatPct(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)}%`;
}

function formatFirstNine(n: number | null): string {
  return n === null ? '—' : n.toFixed(2);
}

export function X01View({ view, dispatch, undo, forfeit, onPlayAgain }: Props) {
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const [legEndData, setLegEndData] = useState<LegEndData | null>(null);
  const [sessionEndData, setSessionEndData] = useState<SessionEndData | null>(null);

  const prevLegIndexRef = useRef(view.legIndex);
  const prevStatusRef = useRef(view.status);
  const prevLegStatsRef = useRef<X01LegStats>(view.legStats);

  useEffect(() => {
    const prevLegIndex = prevLegIndexRef.current;
    const prevStatus = prevStatusRef.current;
    const capturedStats = prevLegStatsRef.current;

    if (view.status !== 'in_progress' && prevStatus === 'in_progress') {
      setSessionEndData({ stats: capturedStats });
    } else if (view.status === 'in_progress' && prevStatus !== 'in_progress') {
      setSessionEndData(null);
    }

    if (view.legIndex > prevLegIndex && view.status === 'in_progress') {
      setLegEndData({
        completedLegNumber: prevLegIndex + 1,
        legsWon: view.legsWon,
        stats: capturedStats
      });
    } else if (view.legIndex < prevLegIndex) {
      setLegEndData(null);
    }

    prevLegIndexRef.current = view.legIndex;
    prevStatusRef.current = view.status;
    prevLegStatsRef.current = view.legStats;
  }, [view]);

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
      dispatch({
        type: 'throw',
        participantId: view.activeParticipantId,
        segment,
        value
      })
    );

  const isOver = view.status !== 'in_progress';
  const won = view.legsWon[view.activeParticipantId] ?? 0;

  return (
    <section className="mx-auto max-w-xl pb-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">X01</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400" data-testid="x01-legs">
          Leg {view.legIndex + 1} · Won {won}/{view.config.legsToWin}
        </span>
      </div>

      <div className="mt-4">
        <X01ScoreHeader view={view} />
      </div>

      <X01TurnStrip view={view} />

      <X01Keypad onDart={onDart} disabled={isOver} />

      <dl
        className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60 sm:grid-cols-4"
        data-testid="x01-leg-stats"
      >
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">3-dart avg</dt>
          <dd className="font-semibold tabular-nums" data-testid="x01-avg3">
            {formatAvg(view.legStats.threeDartAvg)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">First-9 avg</dt>
          <dd className="font-semibold tabular-nums" data-testid="x01-avg9">
            {formatFirstNine(view.legStats.firstNineAvg)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Checkout %</dt>
          <dd className="font-semibold tabular-nums" data-testid="x01-checkout-pct">
            {formatPct(view.legStats.checkoutPct)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Highest finish</dt>
          <dd className="font-semibold tabular-nums" data-testid="x01-highest-finish">
            {view.legStats.highestFinish || '—'}
          </dd>
        </div>
      </dl>

      {!sessionEndData && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => run(() => undo())}
            disabled={!view.canUndo}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="x01-undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => run(() => forfeit(view.activeParticipantId))}
            disabled={isOver}
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            data-testid="x01-forfeit"
          >
            Forfeit
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="x01-quit"
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

      {legEndData && (
        <X01LegEndModal
          completedLegNumber={legEndData.completedLegNumber}
          legsWon={legEndData.legsWon}
          participantId={view.activeParticipantId}
          config={view.config}
          stats={legEndData.stats}
          onContinue={() => setLegEndData(null)}
          onClose={() => setLegEndData(null)}
        />
      )}

      {sessionEndData && (
        <X01SessionEndModal
          status={view.status}
          legsWon={view.legsWon}
          participantId={view.activeParticipantId}
          config={view.config}
          stats={sessionEndData.stats}
          onEndSession={() => navigate('/')}
          onPlayAgain={onPlayAgain}
          onUndo={view.canUndo ? () => run(undo) : undefined}
        />
      )}
    </section>
  );
}
