import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '@/domain/schemas/common';
import type { GameEvent, Session } from '@/domain/types';
import { ReplayScrubber } from '@/screens/history/ReplayScrubber';

const SESSION_ID = '01JARVQZ11111111111111AAAA';
const PARTICIPANT_ID = '01JARVQZ22222222222222BBBB';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: SESSION_ID,
    gameModeId: 'x01',
    gameConfig: { startScore: 301, inRule: 'straight', outRule: 'double', legsToWin: 1 },
    participants: [PARTICIPANT_ID],
    status: 'completed',
    startedAt: '2026-04-19T10:00:00.000Z',
    endedAt: '2026-04-19T10:30:00.000Z',
    createdAt: '2026-04-19T10:00:00.000Z',
    updatedAt: '2026-04-19T10:30:00.000Z',
    ...overrides
  };
}

function makeThrow(
  seq: number,
  segment: string,
  value: number,
  legIndex = 0,
  turnIndexInLeg = 0,
  dartIndex = 0
): GameEvent {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: `01JARVQZ${String(seq).padStart(18, '0')}ZZ`,
    sessionId: SESSION_ID,
    seq,
    type: 'throw',
    payload: {
      participantId: PARTICIPANT_ID,
      segment,
      value,
      dartIndex,
      legIndex,
      turnIndexInLeg
    },
    timestamp: '2026-04-19T10:00:00.000Z'
  };
}

// Turn 1: T20 T20 T20 = 60+60+60 = 180 scored → remaining 121
// Turn 2: T20 T7 D20  = 60+21+40 = 121 → checkout (value is pre-multiplied)
const X01_EVENTS: GameEvent[] = [
  makeThrow(0, 'T', 60, 0, 0, 0),
  makeThrow(1, 'T', 60, 0, 0, 1),
  makeThrow(2, 'T', 60, 0, 0, 2),
  makeThrow(3, 'T', 60, 0, 1, 0),
  makeThrow(4, 'T', 21, 0, 1, 1),
  makeThrow(5, 'D', 40, 0, 1, 2)
];

function renderScrubber(session: Session, events: GameEvent[]) {
  const result = render(
    <MemoryRouter>
      <ReplayScrubber session={session} events={events} />
    </MemoryRouter>
  );
  return { ...result, q: within(result.container) };
}

describe('ReplayScrubber', () => {
  afterEach(() => cleanup());

  it('starts at the end of the event log', () => {
    const { q } = renderScrubber(makeSession(), X01_EVENTS);
    expect(q.getByTestId('replay-position')).toHaveTextContent(
      `Event ${X01_EVENTS.length} / ${X01_EVENTS.length}`
    );
  });

  it('shows 301 remaining when scrubbed to position 0 (no events)', () => {
    const { q } = renderScrubber(makeSession(), X01_EVENTS);
    fireEvent.change(q.getByTestId('replay-slider'), { target: { value: '0' } });
    expect(q.getByTestId(`replay-remaining-${PARTICIPANT_ID}`)).toHaveTextContent('301');
  });

  it('shows 121 remaining after 3 events (turn 1: T20 T20 T20 = 180 scored)', () => {
    const { q } = renderScrubber(makeSession(), X01_EVENTS);
    fireEvent.change(q.getByTestId('replay-slider'), { target: { value: '3' } });
    // 301 - 180 = 121
    expect(q.getByTestId(`replay-remaining-${PARTICIPANT_ID}`)).toHaveTextContent('121');
    expect(q.getByTestId('replay-position')).toHaveTextContent('Event 3 / 6');
  });

  it('prev/next buttons advance the position', () => {
    const { q } = renderScrubber(makeSession(), X01_EVENTS);
    fireEvent.change(q.getByTestId('replay-slider'), { target: { value: '3' } });

    fireEvent.click(q.getByTestId('replay-next'));
    expect(q.getByTestId('replay-position')).toHaveTextContent('Event 4 / 6');

    fireEvent.click(q.getByTestId('replay-prev'));
    expect(q.getByTestId('replay-position')).toHaveTextContent('Event 3 / 6');
  });

  it('start button resets to position 0', () => {
    const { q } = renderScrubber(makeSession(), X01_EVENTS);
    fireEvent.click(q.getByTestId('replay-start'));
    expect(q.getByTestId('replay-position')).toHaveTextContent('Event 0 / 6');
    expect(q.getByTestId(`replay-remaining-${PARTICIPANT_ID}`)).toHaveTextContent('301');
  });

  it('end button returns to the last event', () => {
    const { q } = renderScrubber(makeSession(), X01_EVENTS);
    fireEvent.change(q.getByTestId('replay-slider'), { target: { value: '2' } });
    fireEvent.click(q.getByTestId('replay-end'));
    expect(q.getByTestId('replay-position')).toHaveTextContent(`Event 6 / 6`);
  });

  it('renders freeform replay showing throw count at position', () => {
    const freeformSession = makeSession({ gameModeId: 'freeform', gameConfig: {} });
    const freeformEvents: GameEvent[] = [
      makeThrow(0, 'T', 60),
      makeThrow(1, 'S', 20),
      makeThrow(2, 'D', 10)
    ];
    const { q } = renderScrubber(freeformSession, freeformEvents);
    fireEvent.change(q.getByTestId('replay-slider'), { target: { value: '2' } });
    expect(q.getByTestId('replay-freeform')).toHaveTextContent('Throws at this point: 2');
  });
});
