import type { RtwScoringMultiplier } from '@/games/rtw-scoring';
import { KeypadButton } from '@/ui/primitives';

type Props = {
  onThrow: (multiplier: RtwScoringMultiplier) => void;
  disabled: boolean;
  currentTarget: number | null;
};

export function RtwScoringKeypad({ onThrow, disabled, currentTarget }: Props) {
  const isTripleDisabled = disabled || currentTarget === 25;

  return (
    <div className="mt-4 grid grid-cols-4 gap-2" aria-label="RTW Scoring keypad">
      <KeypadButton
        variant="danger"
        onClick={() => onThrow('miss')}
        disabled={disabled}
        data-testid="rtws-miss"
      >
        Miss
      </KeypadButton>
      <KeypadButton
        onClick={() => onThrow('single')}
        disabled={disabled}
        data-testid="rtws-single"
      >
        Single
      </KeypadButton>
      <KeypadButton
        onClick={() => onThrow('double')}
        disabled={disabled}
        data-testid="rtws-double"
      >
        Double
      </KeypadButton>
      <KeypadButton
        onClick={() => onThrow('triple')}
        disabled={isTripleDisabled}
        data-testid="rtws-triple"
      >
        Triple
      </KeypadButton>
    </div>
  );
}
