import type { CheckoutConfig } from './config';
import { dartScore, getOrderedFinishes, isValidFinisher } from './rules';
import type {
  CheckoutAttempt,
  CheckoutDart,
  CheckoutState,
  CheckoutStatus,
  CheckoutThrowPayload
} from './types';
import type { GameEvent } from '@/domain/types';

export function buildCheckoutState(
  events: GameEvent[],
  config: CheckoutConfig,
  participantIds: string[],
  sessionId: string
): CheckoutState {
  const orderedFinishes = getOrderedFinishes(config);
  const { attemptsPerFinish, outRule } = config;

  const attempts: CheckoutAttempt[] = [];
  let finishIndex = 0;
  let attemptInFinish = 0;
  let status: CheckoutStatus = 'in_progress';
  let currentDarts: CheckoutDart[] = [];

  for (const ev of events) {
    if (status !== 'in_progress') break;
    if (ev.type === 'note') continue;

    if (ev.type === 'forfeit') {
      status = 'forfeited';
      continue;
    }

    if (ev.type !== 'throw') continue;

    const targetFinish = orderedFinishes[finishIndex];
    if (targetFinish === undefined) break;

    const p = ev.payload as CheckoutThrowPayload;
    const scored = dartScore(p.segment, p.value);
    const prevRemaining =
      currentDarts.length === 0
        ? targetFinish
        : currentDarts[currentDarts.length - 1]!.remainingAfter;
    const rawRemaining = prevRemaining - scored;

    const dart: CheckoutDart = {
      segment: p.segment,
      value: p.value,
      scored,
      // Clamp to prevRemaining for display when bust goes below 0
      remainingAfter: rawRemaining < 0 ? prevRemaining : rawRemaining
    };
    currentDarts = [...currentDarts, dart];

    const isCheckout = rawRemaining === 0 && isValidFinisher(p.segment, outRule);
    const isBust =
      rawRemaining < 0 || (rawRemaining === 0 && !isValidFinisher(p.segment, outRule));
    const dartsFull = currentDarts.length >= 3;

    if (isCheckout || isBust || dartsFull) {
      attempts.push({
        finishIndex,
        attemptIndex: attemptInFinish,
        targetFinish,
        darts: currentDarts,
        remainingAtEnd: isCheckout ? 0 : (rawRemaining < 0 ? prevRemaining : rawRemaining),
        success: isCheckout
      });
      currentDarts = [];

      if (isCheckout) {
        // Checkout hit: done with this finish, skip remaining attempts
        finishIndex++;
        attemptInFinish = 0;
      } else {
        attemptInFinish++;
        if (attemptInFinish >= attemptsPerFinish) {
          finishIndex++;
          attemptInFinish = 0;
        }
      }

      if (finishIndex >= orderedFinishes.length) {
        status = 'completed';
        break;
      }
    }
  }

  const currentTargetFinish = orderedFinishes[finishIndex] ?? null;
  const remainingInCurrentAttempt =
    currentDarts.length === 0
      ? (currentTargetFinish ?? 0)
      : currentDarts[currentDarts.length - 1]!.remainingAfter;

  return {
    sessionId,
    participantIds,
    config,
    status,
    inputEventLog: events.filter(
      (e) => e.type === 'throw' || e.type === 'forfeit' || e.type === 'note'
    ),
    orderedFinishes,
    currentFinishIndex: finishIndex,
    currentAttemptInFinish: attemptInFinish,
    dartsInCurrentAttempt: currentDarts.length,
    remainingInCurrentAttempt,
    attempts,
    activeParticipantId: participantIds[0]!
  };
}
