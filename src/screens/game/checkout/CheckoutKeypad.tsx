import { useState } from 'react';
import type { ThrowSegment } from '@/domain/types';
import type { CheckoutOutRule } from '@/games/checkout';
import type { UiFeedbackPrefs } from '@/hooks';
import { dartFeedback } from '@/lib/feedback';
import { KeypadButton } from '@/ui/primitives';

type Multiplier = 'S' | 'D' | 'T';

type Props = {
  onDart: (segment: ThrowSegment, value: number) => void;
  disabled: boolean;
  remainingInAttempt: number;
  outRule: CheckoutOutRule;
  prefs?: UiFeedbackPrefs;
};

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

export function CheckoutKeypad({ onDart, disabled, remainingInAttempt, outRule, prefs }: Props) {
  const [multiplier, setMultiplier] = useState<Multiplier>('S');

  const fireFeedback = () => {
    if (prefs) dartFeedback(prefs);
  };

  const pickNumber = (face: number) => {
    const value = face * (multiplier === 'S' ? 1 : multiplier === 'D' ? 2 : 3);
    fireFeedback();
    onDart(multiplier, value);
    setMultiplier('S');
  };

  const pickBull = () => {
    fireFeedback();
    if (multiplier === 'D') onDart('DB', 50);
    else onDart('SB', 25);
    setMultiplier('S');
  };

  const pickMiss = () => {
    fireFeedback();
    onDart('MISS', 0);
    setMultiplier('S');
  };

  const isFinisher = (face: number): boolean => {
    if (multiplier === 'D') return face * 2 === remainingInAttempt;
    if (multiplier === 'T' && outRule === 'masters') return face * 3 === remainingInAttempt;
    return false;
  };

  const isBullFinisher = (): boolean =>
    multiplier === 'D' && remainingInAttempt === 50;

  return (
    <div className="mt-4" aria-label="Checkout keypad">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Multiplier">
        {(['S', 'D', 'T'] as const).map((m) => (
          <KeypadButton
            key={m}
            variant={multiplier === m ? 'multiplier-active' : 'multiplier'}
            role="radio"
            aria-checked={multiplier === m}
            onClick={() => setMultiplier(m)}
            disabled={disabled}
            data-testid={`checkout-mult-${m}`}
          >
            {m === 'S' ? 'Single' : m === 'D' ? 'Double' : 'Triple'}
          </KeypadButton>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {NUMBERS.map((n) => (
          <KeypadButton
            key={n}
            onClick={() => pickNumber(n)}
            disabled={disabled}
            variant={isFinisher(n) ? 'multiplier-active' : undefined}
            data-testid={`checkout-num-${n}`}
          >
            {n}
          </KeypadButton>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <KeypadButton
          variant={isBullFinisher() ? 'multiplier-active' : 'special'}
          onClick={pickBull}
          disabled={disabled}
          data-testid="checkout-bull"
        >
          {multiplier === 'D' ? 'Bull (50)' : 'Bull (25)'}
        </KeypadButton>
        <KeypadButton
          variant="danger"
          onClick={pickMiss}
          disabled={disabled}
          data-testid="checkout-miss"
        >
          Miss
        </KeypadButton>
      </div>
    </div>
  );
}
