import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X01Keypad } from '../x01/X01Keypad';
import { X01LegEndModal } from '../x01/X01LegEndModal';
import { X01SessionEndModal } from '../x01/X01SessionEndModal';
import { X01TurnStrip } from '../x01/X01TurnStrip';
import type { ThrowSegment, GameEvent } from '@/domain/types';
import type { X01Action, X01LegStats, X01ViewModel, X01LegSummary } from '@/games/x01';
import type { X01VCConfig } from '@/games/x01vc';
import { useKeypadLayout, useUiPrefs, useX01VCAutoPlay } from '@/hooks';
import { InGameSettings } from '@/screens/game/InGameSettings';
import { RulesHelpButton } from '@/ui/help/RulesHelpButton';

type Props = {
  view: X01ViewModel;
  dispatch: (action: X01Action) => Promise<void>;
  undo: () => Promise<void>;
  forfeit: (participantId: string) => Promise<void>;
  onPlayAgain: () => Promise<void>;
  config: X01VCConfig;
  events: GameEvent[];
  participantNames?: Record<string, string>;
};

type LegEndData = {
  completedLegNumber: number;
  legsWon: Record<string, number>;
  stats: X01LegStats;
};

type SessionEndData = {
  stats: X01LegStats;
  participantStats?: Record<string, X01LegStats>;
  legSummaries: X01LegSummary[];
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

export function X01VCView({ view, dispatch, undo, forfeit, onPlayAgain, config, events, participantNames: externalNames }: Props) {
  const navigate = useNavigate();
  const { keypadLayout } = useKeypadLayout();
  const uiPrefs = useUiPrefs();
  const [actionError, setActionError] = useState<string | null>(null);
  const [legEndData, setLegEndData] = useState<LegEndData | null>(null);
  const [sessionEndData, setSessionEndData] = useState<SessionEndData | null>(null);

  const prevLegIndexRef = useRef(view.legIndex);
  const prevStatusRef = useRef(view.status);
  const prevLegStatsRef = useRef<X01LegStats>(view.legStats);

  const computerParticipantId = config.computerParticipantId;

  const participantNames = useMemo<Record<string, string>>(
    () => ({ ...externalNames, [computerParticipantId]: 'Computer' }),
    [externalNames, computerParticipantId]
  );

  // The human participant is whichever entry in participantIds is not the computer.
  const humanParticipantId = view.participantIds.find((id) => id !== computerParticipantId) ?? '';

  const isComputerTurn =
    view.status === 'in_progress' &&
    view.activeParticipantId === computerParticipantId;

  // Auto-drive computer turns
  useX01VCAutoPlay(view, dispatch, config, events);

  useEffect(() => {
    const prevLegIndex = prevLegIndexRef.current;
    const prevStatus = prevStatusRef.current;
    const capturedStats = prevLegStatsRef.current;

    if (view.status !== 'in_progress' && prevStatus === 'in_progress') {
      setSessionEndData({ stats: capturedStats, participantStats: view.participantStats, legSummaries: view.legSummaries });
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
        participantId: humanParticipantId,
        segment,
        value
      })
    );

  const isOver = view.status !== 'in_progress';
  const humanWon = view.legsWon[humanParticipantId] ?? 0;
  const difficultyLabel = `Level ${config.computerDifficulty}`;

  return (
    <section className="mx-auto max-w-xl pb-6">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold">X01 vs Computer</h1>
          <RulesHelpButton gameId="x01vc" />
          <InGameSettings />
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400" data-testid="x01vc-legs">
          Leg {view.legIndex + 1} · Won {humanWon}/{view.config.legsToWin}
        </span>
      </div>

      {/* Score header — two columns: human left, computer right */}
      <header className="mt-4 grid grid-cols-2 gap-3">
        <div className={`rounded-xl p-5 shadow-md ${!isComputerTurn && !isOver ? 'bg-slate-900 text-slate-100 dark:bg-slate-950' : 'bg-slate-700 text-slate-300 dark:bg-slate-800'}`}>
          <div className="mb-1 text-center text-sm font-medium text-slate-300">You</div>
          <div className="text-center text-5xl font-bold tabular-nums" data-testid="x01vc-remaining">
            {view.participantRemaining[humanParticipantId] ?? view.config.startScore}
          </div>
          <div className="mt-1 text-center text-xs text-slate-400" data-testid="x01vc-status">
            {isOver && view.status === 'completed' && 'Match over'}
            {isOver && view.status === 'forfeited' && 'Forfeited'}
            {!isOver && !isComputerTurn && (
              view.config.inRule === 'double' && !view.opened ? 'Double-in required' : 'Your throw'
            )}
            {!isOver && isComputerTurn && '\u00a0'}
          </div>
        </div>
        <div className={`rounded-xl p-5 shadow-md ${isComputerTurn && !isOver ? 'bg-slate-900 text-slate-100 dark:bg-slate-950' : 'bg-slate-700 text-slate-300 dark:bg-slate-800'}`}>
          <div className="mb-1 text-center text-sm font-medium text-slate-300">Computer ({difficultyLabel})</div>
          <div className="text-center text-5xl font-bold tabular-nums" data-testid="x01vc-computer-remaining">
            {view.participantRemaining[computerParticipantId] ?? view.config.startScore}
          </div>
          <div className="mt-1 text-center text-xs text-slate-400">
            {!isOver && isComputerTurn && 'Throwing…'}
            {(isOver || !isComputerTurn) && '\u00a0'}
          </div>
        </div>
      </header>

      <X01TurnStrip view={view} />

      {/* Computer-turn overlay replaces the keypad */}
      {isComputerTurn && !isOver ? (
        <div
          className="mt-4 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-10 dark:border-slate-700 dark:bg-slate-800/40"
          data-testid="x01vc-computer-thinking"
          aria-live="polite"
          aria-label="Computer is throwing"
        >
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Computer is throwing…
          </p>
        </div>
      ) : (
        <X01Keypad onDart={onDart} disabled={isOver || isComputerTurn} layout={keypadLayout} prefs={uiPrefs} />
      )}

      <dl
        className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60 sm:grid-cols-4"
        data-testid="x01vc-leg-stats"
      >
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">3-dart avg</dt>
          <dd className="font-semibold tabular-nums" data-testid="x01vc-avg3">
            {formatAvg(view.legStats.threeDartAvg)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">First-9 avg</dt>
          <dd className="font-semibold tabular-nums" data-testid="x01vc-avg9">
            {formatFirstNine(view.legStats.firstNineAvg)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Checkout %</dt>
          <dd className="font-semibold tabular-nums" data-testid="x01vc-checkout-pct">
            {formatPct(view.legStats.checkoutPct)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Highest finish</dt>
          <dd className="font-semibold tabular-nums" data-testid="x01vc-highest-finish">
            {view.legStats.highestFinish || '—'}
          </dd>
        </div>
      </dl>

      {!sessionEndData && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => run(() => undo())}
            disabled={!view.canUndo || isComputerTurn}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="x01vc-undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => run(() => forfeit(humanParticipantId))}
            disabled={isOver}
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            data-testid="x01vc-forfeit"
          >
            Forfeit
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="x01vc-quit"
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
          participantId={humanParticipantId}
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
          participantId={humanParticipantId}
          participantIds={view.participantIds}
          participantNames={participantNames}
          participantStats={sessionEndData.participantStats}
          legSummaries={sessionEndData.legSummaries}
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
