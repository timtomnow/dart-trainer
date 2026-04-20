import { useState } from 'react';
import type { ThrowSegment } from '@/domain/types';
import { KeypadButton } from '@/ui/primitives';

type Multiplier = 'S' | 'D' | 'T';

type Props = {
  onDart: (segment: ThrowSegment, value: number) => void;
  disabled: boolean;
};

const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15] as const;

export function CricketKeypad({ onDart, disabled }: Props) {
  const [multiplier, setMultiplier] = useState<Multiplier>('S');

  const pickNumber = (face: number) => {
    const value = face * (multiplier === 'S' ? 1 : multiplier === 'D' ? 2 : 3);
    onDart(multiplier, value);
    setMultiplier('S');
  };

  const pickBull = () => {
    // Triple bull doesn't exist; treat T as double for bull
    if (multiplier === 'D' || multiplier === 'T') onDart('DB', 50);
    else onDart('SB', 25);
    setMultiplier('S');
  };

  const pickMiss = () => {
    onDart('MISS', 0);
    setMultiplier('S');
  };

  return (
    <div className="mt-4" aria-label="Cricket keypad">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Multiplier">
        {(['S', 'D', 'T'] as const).map((m) => (
          <KeypadButton
            key={m}
            variant={multiplier === m ? 'multiplier-active' : 'multiplier'}
            role="radio"
            aria-checked={multiplier === m}
            onClick={() => setMultiplier(m)}
            disabled={disabled}
            data-testid={`cricket-mult-${m}`}
          >
            {m === 'S' ? 'Single' : m === 'D' ? 'Double' : 'Triple'}
          </KeypadButton>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {CRICKET_NUMBERS.map((n) => (
          <KeypadButton
            key={n}
            onClick={() => pickNumber(n)}
            disabled={disabled}
            data-testid={`cricket-num-${n}`}
          >
            {n}
          </KeypadButton>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <KeypadButton
          variant="special"
          onClick={pickBull}
          disabled={disabled}
          data-testid="cricket-bull"
        >
          {multiplier === 'D' || multiplier === 'T' ? 'Bull (50)' : 'Bull (25)'}
        </KeypadButton>
        <KeypadButton
          variant="danger"
          onClick={pickMiss}
          disabled={disabled}
          data-testid="cricket-miss"
        >
          Miss
        </KeypadButton>
      </div>
    </div>
  );
}
