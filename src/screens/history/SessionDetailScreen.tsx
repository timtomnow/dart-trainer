import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReplayScrubber } from './ReplayScrubber';
import { useStorage } from '@/app/providers/StorageProvider';
import type { GameEvent, Session } from '@/domain/types';
import { parseX01Config } from '@/games/x01/config';
import { buildX01State } from '@/games/x01/replay';
import { useSessionDetail } from '@/hooks';
import { computeX01LegBreakdowns, computeX01SessionStats } from '@/stats/x01Session';

function formatDuration(startedAt: string, endedAt: string | undefined): string {
  if (!endedAt) return 'ongoing';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatAvg(n: number) {
  return n.toFixed(2);
}

function formatPct(n: number | null) {
  return n === null ? '—' : `${n.toFixed(1)}%`;
}

function ConfigSummary({ session }: { session: Session }) {
  const isX01 = session.gameModeId === 'x01';
  if (!isX01) {
    return (
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Mode</dt>
          <dd className="font-medium capitalize">{session.gameModeId}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Participants</dt>
          <dd className="font-medium">{session.participants.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Duration</dt>
          <dd className="font-medium">{formatDuration(session.startedAt, session.endedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Outcome</dt>
          <dd className="font-medium capitalize">{session.status}</dd>
        </div>
      </dl>
    );
  }

  const config = parseX01Config(session.gameConfig);
  const OUT_LABEL: Record<typeof config.outRule, string> = {
    straight: 'Straight-out',
    double: 'Double-out',
    masters: 'Masters-out'
  };

  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Start score</dt>
        <dd className="font-medium" data-testid="detail-start-score">{config.startScore}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">In rule</dt>
        <dd className="font-medium capitalize">{config.inRule}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Out rule</dt>
        <dd className="font-medium">{OUT_LABEL[config.outRule]}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Legs</dt>
        <dd className="font-medium">{config.legsToWin}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Duration</dt>
        <dd className="font-medium">{formatDuration(session.startedAt, session.endedAt)}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Outcome</dt>
        <dd className="font-medium capitalize">{session.status}</dd>
      </div>
    </dl>
  );
}

function X01LegTable({
  session,
  events,
  participantId
}: {
  session: Session;
  events: GameEvent[];
  participantId: string;
}) {
  const config = parseX01Config(session.gameConfig);
  const state = buildX01State(events, config, session.participants, session.id);
  const breakdowns = computeX01LegBreakdowns(state.legs, participantId, config);

  if (breakdowns.length === 0) {
    return <p className="text-sm text-slate-500">No legs recorded.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="x01-leg-table">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
            <th className="pb-2 pr-4 font-medium">Leg</th>
            <th className="pb-2 pr-4 font-medium">Darts</th>
            <th className="pb-2 pr-4 font-medium">Checkout</th>
            <th className="pb-2 pr-4 font-medium">3-dart avg</th>
            <th className="pb-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {breakdowns.map((leg) => {
            const won = leg.winnerParticipantId === participantId;
            return (
              <tr
                key={leg.legIndex}
                className="border-b border-slate-100 dark:border-slate-800"
                data-testid={`leg-row-${leg.legIndex}`}
              >
                <td className="py-2 pr-4 tabular-nums">{leg.legIndex + 1}</td>
                <td className="py-2 pr-4 tabular-nums">{leg.dartsUsed || '—'}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {leg.checkoutValue > 0 ? leg.checkoutValue : '—'}
                </td>
                <td className="py-2 pr-4 tabular-nums">
                  {formatAvg(leg.legStats.threeDartAvg)}
                </td>
                <td
                  className={`py-2 font-medium ${won ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}
                >
                  {won ? 'Won' : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function X01StatsPanel({
  session,
  events,
  participantId
}: {
  session: Session;
  events: GameEvent[];
  participantId: string;
}) {
  const config = parseX01Config(session.gameConfig);
  const state = buildX01State(events, config, session.participants, session.id);
  const stats = computeX01SessionStats(state, config, participantId);

  return (
    <dl
      className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60 sm:grid-cols-4"
      data-testid="x01-session-stats"
    >
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">3-dart avg</dt>
        <dd className="font-semibold tabular-nums">{formatAvg(stats.threeDartAvg)}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">First-9 avg</dt>
        <dd className="font-semibold tabular-nums">
          {stats.firstNineAvg !== null ? formatAvg(stats.firstNineAvg) : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Checkout %</dt>
        <dd className="font-semibold tabular-nums">{formatPct(stats.checkoutPct)}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Highest finish</dt>
        <dd className="font-semibold tabular-nums">
          {stats.highestFinish > 0 ? stats.highestFinish : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">180s</dt>
        <dd className="font-semibold tabular-nums">{stats.count180}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Darts thrown</dt>
        <dd className="font-semibold tabular-nums">{stats.dartsThrown}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Busts</dt>
        <dd className="font-semibold tabular-nums">{stats.busts}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500 dark:text-slate-400">Legs won</dt>
        <dd className="font-semibold tabular-nums">{stats.legsWon}</dd>
      </div>
    </dl>
  );
}

function EventLogPanel({ events }: { events: GameEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No events recorded.</p>;
  }

  return (
    <div className="overflow-x-auto" data-testid="event-log">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
            <th className="pb-2 pr-3 font-medium">#</th>
            <th className="pb-2 pr-3 font-medium">Type</th>
            <th className="pb-2 pr-3 font-medium">Payload</th>
            <th className="pb-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr
              key={ev.id}
              className="border-b border-slate-100 dark:border-slate-800"
              data-testid={`event-row-${ev.seq}`}
            >
              <td className="py-1.5 pr-3 tabular-nums text-slate-400">{ev.seq}</td>
              <td className="py-1.5 pr-3 font-medium">{displayEventType(ev.type, ev.payload)}</td>
              <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">
                {summarisePayload(ev.type, ev.payload)}
              </td>
              <td className="py-1.5 text-slate-400">
                {new Date(ev.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isRtwGroupBPayload(p: Record<string, unknown>): boolean {
  return 'hitsInTurn' in p && 'targetValue' in p;
}

function isRtwGroupAPayload(p: Record<string, unknown>): boolean {
  return 'hit' in p && 'targetValue' in p;
}

function summarisePayload(type: string, payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const p = payload as Record<string, unknown>;
  if (type === 'throw') {
    if (isRtwGroupBPayload(p)) {
      return `T${p['targetValue']} — ${p['hitsInTurn']}/3 hits`;
    }
    if (isRtwGroupAPayload(p)) {
      return `T${p['targetValue']} — ${p['hit'] ? 'hit' : 'miss'}`;
    }
    const seg = String(p['segment'] ?? '');
    const val = p['value'];
    return `${seg}${val}`;
  }
  if (type === 'forfeit') return `pid:${String(p['participantId'] ?? '').slice(-4)}`;
  if (type === 'note') return String(p['text'] ?? '').slice(0, 40);
  return JSON.stringify(payload).slice(0, 60);
}

function displayEventType(type: string, payload: unknown): string {
  if (type === 'throw' && payload && typeof payload === 'object') {
    if (isRtwGroupBPayload(payload as Record<string, unknown>)) return 'turn';
  }
  return type;
}

function SessionDetailContent({
  session,
  events
}: {
  session: Session;
  events: GameEvent[];
}) {
  const isX01 = session.gameModeId === 'x01';
  const participantId = session.participants[0] ?? '';

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-base font-semibold">Config</h2>
        <ConfigSummary session={session} />
      </section>

      {isX01 && (
        <>
          <section>
            <h2 className="mb-3 text-base font-semibold">Legs</h2>
            <X01LegTable session={session} events={events} participantId={participantId} />
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold">Stats</h2>
            <X01StatsPanel session={session} events={events} participantId={participantId} />
          </section>
        </>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">Replay</h2>
        <ReplayScrubber session={session} events={events} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Event log</h2>
        <EventLogPanel events={events} />
      </section>
    </div>
  );
}

export function SessionDetailScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const adapter = useStorage();
  const { session, events, loading, error } = useSessionDetail(sessionId ?? '');
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  if (!sessionId) {
    navigate('/history', { replace: true });
    return null;
  }

  const onDiscard = async () => {
    const confirmed = window.confirm(
      'Permanently delete this session and all its data? This cannot be undone.'
    );
    if (!confirmed) return;
    setDiscarding(true);
    setDiscardError(null);
    try {
      await adapter.discardSession(sessionId);
      navigate('/history', { replace: true });
    } catch (err) {
      setDiscardError(err instanceof Error ? err.message : String(err));
      setDiscarding(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          data-testid="detail-back"
        >
          Back
        </button>
        <h1 className="text-2xl font-semibold">Session detail</h1>
        {session && (
          <button
            type="button"
            onClick={onDiscard}
            disabled={discarding}
            className="ml-auto rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            data-testid="detail-discard"
          >
            {discarding ? 'Discarding…' : 'Discard session'}
          </button>
        )}
      </div>
      {discardError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {discardError}
        </p>
      )}

      {loading && (
        <p className="text-sm text-slate-500" aria-busy="true">
          Loading…
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      )}

      {!loading && !error && session && (
        <SessionDetailContent session={session} events={events} />
      )}

      {!loading && !error && !session && (
        <p className="text-sm text-slate-500">Session not found.</p>
      )}
    </section>
  );
}
