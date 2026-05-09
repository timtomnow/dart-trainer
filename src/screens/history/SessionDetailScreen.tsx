import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReplayScrubber } from './ReplayScrubber';
import { MODE_DETAIL_REGISTRY } from './detail/registry';
import { CommonConfigItems } from './detail/shared/CommonConfigItems';
import { ConfigGrid, ConfigItem } from './detail/shared/ConfigGrid';
import { useStorage } from '@/app/providers/StorageProvider';
import type { GameEvent, Session } from '@/domain/types';
import { useProfiles, useSessionDetail } from '@/hooks';

function GenericConfigSummary({ session }: { session: Session }) {
  return (
    <ConfigGrid>
      <ConfigItem label="Mode" value={<span className="capitalize">{session.gameModeId}</span>} />
      <ConfigItem label="Players" value={session.participants.length} />
      <CommonConfigItems session={session} />
    </ConfigGrid>
  );
}

function isRtwGroupBPayload(p: Record<string, unknown>): boolean {
  return 'hitsInTurn' in p && 'targetValue' in p;
}

function isRtwGroupAPayload(p: Record<string, unknown>): boolean {
  return 'hit' in p && 'targetValue' in p;
}

function isRtwScoringPayload(p: Record<string, unknown>): boolean {
  return 'multiplier' in p && 'targetValue' in p;
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
    if (isRtwScoringPayload(p)) {
      return `T${p['targetValue']} — ${String(p['multiplier'])}`;
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

function SessionDetailContent({
  session,
  events,
  participantNames
}: {
  session: Session;
  events: GameEvent[];
  participantNames: Record<string, string>;
}) {
  const detailModule = MODE_DETAIL_REGISTRY[session.gameModeId];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-base font-semibold">Config</h2>
        {detailModule ? (
          <detailModule.ConfigSummary
            session={session}
            events={events}
            participantNames={participantNames}
          />
        ) : (
          <GenericConfigSummary session={session} />
        )}
      </section>

      {detailModule && (
        <detailModule.CustomContent
          session={session}
          events={events}
          participantNames={participantNames}
        />
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
  const { profiles } = useProfiles();
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  const participantNames = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of profiles) map[p.id] = p.name;
    return map;
  }, [profiles]);

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
        <SessionDetailContent
          session={session}
          events={events}
          participantNames={participantNames}
        />
      )}

      {!loading && !error && !session && (
        <p className="text-sm text-slate-500">Session not found.</p>
      )}
    </section>
  );
}
