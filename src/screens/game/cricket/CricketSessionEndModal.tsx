import { useState } from 'react';
import type { CricketStatus } from '@/games/cricket';
import type { CricketParticipantStats } from '@/stats/types';

type Props = {
  status: CricketStatus;
  legsWon: Record<string, number>;
  participantId: string;
  participantIds?: string[];
  participantNames?: Record<string, string>;
  participantStats?: Record<string, CricketParticipantStats>;
  marksPerRound: number;
  totalMarks: number;
  onEndSession: () => void;
  onPlayAgain: () => Promise<void>;
  onUndo?: () => void;
};

export function CricketSessionEndModal({
  status,
  legsWon,
  participantId,
  participantIds,
  participantNames,
  participantStats,
  marksPerRound,
  totalMarks,
  onEndSession,
  onPlayAgain,
  onUndo
}: Props) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const won = legsWon[participantId] ?? 0;
  const isMulti = participantIds && participantIds.length > 1 && participantStats;

  const handlePlayAgain = async () => {
    setStarting(true);
    setError(null);
    try {
      await onPlayAgain();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStarting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Session complete"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="text-lg font-semibold">
          {status === 'completed' ? 'Match won' : 'Session forfeited'}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Cricket · {won} leg{won !== 1 ? 's' : ''} won
        </p>

        {isMulti ? (
          <div className="mt-4 space-y-2">
            {participantIds.map((pid) => {
              const ps = participantStats[pid];
              const name = participantNames?.[pid] ?? pid;
              const pWon = legsWon[pid] ?? 0;
              if (!ps) return null;
              return (
                <div key={pid} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                  <div className="mb-1 font-medium">
                    {name}
                    <span className="ml-2 text-xs text-slate-500">{pWon} leg{pWon !== 1 ? 's' : ''}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">MPR</dt>
                      <dd className="font-semibold tabular-nums">{ps.marksPerRound.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Total marks</dt>
                      <dd className="font-semibold tabular-nums">{ps.totalMarks}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Marks per round</dt>
              <dd className="font-semibold tabular-nums" data-testid="cricket-mpr">
                {marksPerRound.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Total marks</dt>
              <dd className="font-semibold tabular-nums" data-testid="cricket-total-marks">
                {totalMarks}
              </dd>
            </div>
          </dl>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              data-testid="cricket-undo"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={onEndSession}
            className="flex-1 rounded-md border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            data-testid="cricket-quit"
          >
            Quit
          </button>
          <button
            type="button"
            onClick={handlePlayAgain}
            disabled={starting}
            className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="cricket-play-again"
          >
            {starting ? 'Starting…' : 'Play Again'}
          </button>
        </div>
      </div>
    </div>
  );
}
