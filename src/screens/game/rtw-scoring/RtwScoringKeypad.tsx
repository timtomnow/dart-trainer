import type { RtwScoringMultiplier } from '@/games/rtw-scoring';
import type { UiFeedbackPrefs } from '@/hooks';
import { dartFeedback } from '@/lib/feedback';
import { KeypadButton } from '@/ui/primitives';

type Props = {
  onThrow: (multiplier: RtwScoringMultiplier) => void;
  disabled: boolean;
  currentTarget: number | null;
  prefs?: UiFeedbackPrefs;
};

export function RtwScoringKeypad({ onThrow, disabled, currentTarget, prefs }: Props) {
  const isTripleDisabled = disabled || currentTarget === 25;

  const handle = (m: RtwScoringMultiplier) => {
    if (prefs) dartFeedback(prefs);
    onThrow(m);
  };

  return (
    <div className="mt-4 grid grid-cols-4 gap-2" aria-label="RTW Scoring keypad">
      <KeypadButton
        variant="danger"
        onClick={() => handle('miss')}
        disabled={disabled}
        data-testid="rtws-miss"
      >
        Miss
      </KeypadButton>
      <KeypadButton
        onClick={() => handle('single')}
        disabled={disabled}
        data-testid="rtws-single"
      >
        Single
      </KeypadButton>
      <KeypadButton
        onClick={() => handle('double')}
        disabled={disabled}
        data-testid="rtws-double"
      >
        Double
      </KeypadButton>
      <KeypadButton
        onClick={() => handle('triple')}
        disabled={isTripleDisabled}
        data-testid="rtws-triple"
      >
        Triple
      </KeypadButton>
    </div>
  );
}
