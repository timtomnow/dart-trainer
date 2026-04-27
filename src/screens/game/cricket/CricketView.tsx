import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CricketKeypad } from './CricketKeypad';
import { CricketScoreboard } from './CricketScoreboard';
import { CricketSessionEndModal } from './CricketSessionEndModal';
import type { ThrowSegment } from '@/domain/types';
import { CRICKET_TARGETS } from '@/games/cricket';
import type { CricketAction, CricketViewModel } from '@/games/cricket';
import type { CricketParticipantStats } from '@/stats/types';

type Props = {
  view: CricketViewModel;
  dispatch: (action: CricketAction) => Promise<void>;
  undo: () => Promise<void>;
  forfeit: (participantId: string) => Promise<void>;
  onPlayAgain: () => Promise<void>;
  participantNames?: Record<string, string>;
};

type SessionEndData = {
  marksPerRound: number;
  totalMarks: number;
  participantStats?: Record<string, CricketParticipantStats>;
};

function computeLiveStats(view: CricketViewModel): { marksPerRound: number; totalMarks: number } {
  let total = 0;
  for (const pid of view.participantIds) {
    for (const [, m] of Object.entries(view.marks[pid] ?? {})) {
      total += Math.min(m, 3) as number;
    }
  }
  return { marksPerRound: 0, totalMarks: total };
}

export function CricketView({ view, dispatch, undo, forfeit, onPlayAgain, participantNames }: Props) {
  const navigate = useNavigate();
  const [actionError, setActionError] = useState<string | null>(null);
  const [sessionEndData, setSessionEndData] = useState<SessionEndData | null>(null);

  const prevStatusRef = useRef(view.status);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    if (view.status !== 'in_progress' && prevStatus === 'in_progress') {
      const stats = computeLiveStats(view);
      setSessionEndData({ ...stats, participantStats: view.participantStats });
    } else if (view.status === 'in_progress' && prevStatus !== 'in_progress') {
      setSessionEndData(null);
    }
    prevStatusRef.current = view.status;
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
  const activePidMarks = view.marks[view.activeParticipantId] ?? {};
  const marksRemaining = CRICKET_TARGETS.reduce((sum, t) => sum + Math.max(0, 3 - (activePidMarks[t] ?? 0)), 0);

  return (
    <section className="mx-auto max-w-xl pb-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Cricket</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400" data-testid="cricket-legs">
          Leg {view.legIndex + 1} · Won {won}/{view.config.legsToWin}
        </span>
      </div>

      <CricketScoreboard
        marks={view.marks}
        participantIds={view.participantIds}
        activeParticipantId={view.activeParticipantId}
        currentTurnDarts={view.currentTurn.darts}
      />

      <CricketKeypad onDart={onDart} disabled={isOver} />

      <dl
        className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60"
        data-testid="cricket-turn-stats"
      >
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Marks this turn</dt>
          <dd className="font-semibold tabular-nums" data-testid="cricket-turn-marked">
            {view.currentTurn.marked}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Marks remaining</dt>
          <dd className="font-semibold tabular-nums" data-testid="cricket-marks-remaining">
            {marksRemaining}
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
            data-testid="cricket-undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => run(() => forfeit(view.activeParticipantId))}
            disabled={isOver}
            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            data-testid="cricket-forfeit"
          >
            Forfeit
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="ml-auto rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="cricket-quit"
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

      {sessionEndData && (
        <CricketSessionEndModal
          status={view.status}
          legsWon={view.legsWon}
          participantId={view.activeParticipantId}
          participantIds={view.participantIds}
          participantNames={participantNames}
          participantStats={sessionEndData.participantStats}
          marksPerRound={sessionEndData.marksPerRound}
          totalMarks={sessionEndData.totalMarks}
          onEndSession={() => navigate('/')}
          onPlayAgain={onPlayAgain}
          onUndo={view.canUndo ? () => run(undo) : undefined}
        />
      )}
    </section>
  );
}
