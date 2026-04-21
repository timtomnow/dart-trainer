import { useState } from 'react';
import type { ThrowSegment } from '@/domain/types';
import { KeypadButton } from '@/ui/primitives';

type Multiplier = 'S' | 'D' | 'T';

type Props = {
  onDart: (segment: ThrowSegment, value: number) => void;
  disabled: boolean;
  currentTarget: number | null;
  showBull: boolean;
};

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

export function RtwScoringKeypad({ onDart, disabled, currentTarget, showBull }: Props) {
  const [multiplier, setMultiplier] = useState<Multiplier>('S');

  const pickNumber = (face: number) => {
    const value = face * (multiplier === 'S' ? 1 : multiplier === 'D' ? 2 : 3);
    onDart(multiplier, value);
    setMultiplier('S');
  };

  const pickBull = () => {
    if (multiplier === 'D') onDart('DB', 50);
    else onDart('SB', 25);
    setMultiplier('S');
  };

  const pickMiss = () => {
    onDart('MISS', 0);
    setMultiplier('S');
  };

  return (
    <div className="mt-4" aria-label="RTW Scoring keypad">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Multiplier">
        {(['S', 'D', 'T'] as const).map((m) => (
          <KeypadButton
            key={m}
            variant={multiplier === m ? 'multiplier-active' : 'multiplier'}
            role="radio"
            aria-checked={multiplier === m}
            onClick={() => setMultiplier(m)}
            disabled={disabled}
            data-testid={`rtws-mult-${m}`}
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
            variant={n === currentTarget ? 'multiplier-active' : undefined}
            data-testid={`rtws-num-${n}`}
          >
            {n}
          </KeypadButton>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {showBull && (
          <KeypadButton
            variant={currentTarget === 25 ? 'multiplier-active' : 'special'}
            onClick={pickBull}
            disabled={disabled}
            data-testid="rtws-bull"
          >
            {multiplier === 'D' ? 'Bull (50)' : 'Bull (25)'}
          </KeypadButton>
        )}
        <KeypadButton
          variant="danger"
          onClick={pickMiss}
          disabled={disabled}
          data-testid="rtws-miss"
          className={!showBull ? 'col-span-2' : ''}
        >
          Miss
        </KeypadButton>
      </div>
    </div>
  );
}
