import { useNavigate } from 'react-router-dom';
import type { Session } from '@/domain/types';
import { useSessionEvents } from '@/hooks';
import { computeHeadlineStat, formatHeadlineStat } from '@/stats/headlineStat';

type Props = { session: Session };

function formatDuration(startedAt: string, endedAt: string | undefined): string {
  if (!endedAt) return '';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function outcomeLabel(status: Session['status']): string {
  switch (status) {
    case 'completed': return 'Won';
    case 'forfeited': return 'Forfeited';
    case 'abandoned': return 'Abandoned';
    default: return '';
  }
}

function outcomeClass(status: Session['status']): string {
  switch (status) {
    case 'completed': return 'text-emerald-700 dark:text-emerald-400';
    case 'forfeited': return 'text-amber-700 dark:text-amber-400';
    case 'abandoned': return 'text-slate-500';
    default: return 'text-slate-500';
  }
}

function gameModeLabel(gameModeId: string): string {
  switch (gameModeId) {
    case 'x01': return 'X01';
    case 'freeform': return 'Freeform';
    default: return gameModeId;
  }
}

export function SessionRow({ session }: Props) {
  const navigate = useNavigate();
  const { events, loading } = useSessionEvents(session.id);

  const headline = loading
    ? null
    : formatHeadlineStat(computeHeadlineStat(session, events));

  const duration = formatDuration(session.startedAt, session.endedAt);

  return (
    <button
      type="button"
      className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
      onClick={() => navigate(`/history/${session.id}`)}
      data-testid={`session-row-${session.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{gameModeLabel(session.gameModeId)}</span>
            {session.gameModeId === 'x01' && (
              <span className="text-xs text-slate-500">
                {String((session.gameConfig as { startScore?: number })?.startScore ?? '')}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {new Date(session.startedAt).toLocaleString()}
            {duration && <span className="ml-2">{duration}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className={`text-xs font-medium ${outcomeClass(session.status)}`}>
            {outcomeLabel(session.status)}
          </span>
          {headline && (
            <span className="text-xs text-slate-500 dark:text-slate-400">{headline}</span>
          )}
        </div>
      </div>
    </button>
  );
}
