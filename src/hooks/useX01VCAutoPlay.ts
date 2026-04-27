import { useEffect } from 'react';
import type { GameEvent } from '@/domain/types';
import { computerThrow, makeThrowRng } from '@/games/ai';
import type { AiDifficulty } from '@/games/ai';
import type { X01Action, X01ViewModel } from '@/games/x01';
import type { X01VCConfig } from '@/games/x01vc';

const FIRST_DART_DELAY_MS = 80;

/**
 * Drives computer turns in an X01 vs Computer session.
 *
 * When it is the computer's turn (activeParticipantId === computerParticipantId
 * and session is in_progress), this hook schedules the next dart throw.
 * The first dart of each turn is delayed by FIRST_DART_DELAY_MS so the result
 * appears after a brief pause; subsequent darts in the same turn fire immediately.
 *
 * One dart is dispatched per effect run. After each dispatch the hook's deps
 * (events.length, view.currentTurn.dartIndex) change, triggering the next dart
 * until the turn ends and activeParticipantId rotates back to the human.
 */
export function useX01VCAutoPlay(
  view: X01ViewModel | null,
  dispatch: (action: X01Action) => Promise<void>,
  config: X01VCConfig | undefined,
  events: GameEvent[]
): void {
  const computerParticipantId = config?.computerParticipantId;
  const isComputerTurn =
    view !== null &&
    view.status === 'in_progress' &&
    !!computerParticipantId &&
    view.activeParticipantId === computerParticipantId;

  const dartIndex = view?.currentTurn.dartIndex ?? 0;
  const remaining = view?.remaining ?? 0;
  const eventCount = events.length;

  useEffect(() => {
    if (!isComputerTurn || !config || !computerParticipantId) return;

    const difficulty = config.computerDifficulty as AiDifficulty;
    const rng = makeThrowRng(config.computerSeed, eventCount);
    const dart = computerThrow(remaining, difficulty, rng);
    const delay = dartIndex === 0 ? FIRST_DART_DELAY_MS : 0;

    const timer = setTimeout(() => {
      void dispatch({
        type: 'throw',
        participantId: computerParticipantId,
        segment: dart.segment,
        value: dart.value
      });
    }, delay);

    return () => clearTimeout(timer);
    // Intentionally omitting `dispatch` from deps: it is stable within a session
    // and including it would cause spurious re-runs on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComputerTurn, dartIndex, eventCount]);
}
