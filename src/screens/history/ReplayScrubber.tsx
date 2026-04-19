import { useState } from 'react';
import type { GameEvent, Session } from '@/domain/types';
import { parseX01Config } from '@/games/x01/config';
import { buildX01State } from '@/games/x01/replay';

type Props = {
  session: Session;
  events: GameEvent[];
};

function FreeformReplay({ events, position }: { events: GameEvent[]; position: number }) {
  const count = events.slice(0, position).filter((e) => e.type === 'throw').length;
  return (
    <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/60" data-testid="replay-freeform">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Throws at this point: <span className="font-semibold tabular-nums">{count}</span>
      </p>
    </div>
  );
}

function X01Replay({
  session,
  events,
  position
}: {
  session: Session;
  events: GameEvent[];
  position: number;
}) {
  const config = parseX01Config(session.gameConfig);
  const sliced = events.slice(0, position);
  const state = buildX01State(sliced, config, session.participants, session.id);

  const leg = state.legs.at(-1);
  const openTurn = leg ? leg.turns.find((t) => !t.closed) : undefined;

  return (
    <div
      className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/60"
      data-testid="replay-x01"
    >
      <div className="flex flex-wrap gap-4">
        {session.participants.map((pid) => {
          const remaining =
            leg ? (leg.remaining[pid] ?? config.startScore) : config.startScore;
          return (
            <div key={pid}>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Participant
              </div>
              <div
                className="text-3xl font-bold tabular-nums"
                data-testid={`replay-remaining-${pid}`}
              >
                {remaining}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Leg {(leg?.index ?? 0) + 1}
        {openTurn && openTurn.darts.length > 0 && (
          <span className="ml-2">
            · {openTurn.darts.length} dart{openTurn.darts.length !== 1 ? 's' : ''} this turn
            · {openTurn.scored} scored
          </span>
        )}
        <span className="ml-2" data-testid="replay-status">
          {state.status !== 'in_progress' ? ` · ${state.status}` : ''}
        </span>
      </div>
    </div>
  );
}

export function ReplayScrubber({ session, events }: Props) {
  const [position, setPosition] = useState(events.length);
  const isX01 = session.gameModeId === 'x01';

  return (
    <section aria-label="Replay scrubber">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Replay</span>
        <span className="text-xs text-slate-500 dark:text-slate-400" data-testid="replay-position">
          Event {position} / {events.length}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={events.length}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        className="w-full"
        aria-label="Scrub replay position"
        data-testid="replay-slider"
      />

      <div className="mt-3">
        {isX01 ? (
          <X01Replay session={session} events={events} position={position} />
        ) : (
          <FreeformReplay events={events} position={position} />
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setPosition(0)}
          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          data-testid="replay-start"
        >
          Start
        </button>
        <button
          type="button"
          onClick={() => setPosition((p) => Math.max(0, p - 1))}
          disabled={position === 0}
          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
          data-testid="replay-prev"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => setPosition((p) => Math.min(events.length, p + 1))}
          disabled={position === events.length}
          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
          data-testid="replay-next"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => setPosition(events.length)}
          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          data-testid="replay-end"
        >
          End
        </button>
      </div>
    </section>
  );
}
