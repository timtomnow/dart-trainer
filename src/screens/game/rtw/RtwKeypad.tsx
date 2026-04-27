import type { RtwMode } from '@/games/rtw';
import type { UiFeedbackPrefs } from '@/hooks';
import { dartFeedback } from '@/lib/feedback';
import { KeypadButton } from '@/ui/primitives';

type Props = {
  mode: RtwMode;
  onGroupA: (hit: boolean) => void;
  onGroupB: (hitsInTurn: 0 | 1 | 2 | 3) => void;
  disabled: boolean;
  prefs?: UiFeedbackPrefs;
};

const GROUP_B_LABELS: Record<0 | 1 | 2 | 3, string> = {
  0: 'Miss',
  1: '1 Hit',
  2: '2 Hits',
  3: '3 Hits'
};

export function RtwKeypad({ mode, onGroupA, onGroupB, disabled, prefs }: Props) {
  const fireFeedback = () => {
    if (prefs) dartFeedback(prefs);
  };

  const handleGroupA = (hit: boolean) => {
    fireFeedback();
    onGroupA(hit);
  };

  const handleGroupB = (hits: 0 | 1 | 2 | 3) => {
    fireFeedback();
    onGroupB(hits);
  };

  if (mode === 'Hit once' || mode === '1-dart per target') {
    return (
      <div className="mt-4 grid grid-cols-2 gap-4" aria-label="RTW keypad">
        <KeypadButton
          variant="multiplier-active"
          onClick={() => handleGroupA(true)}
          disabled={disabled}
          className="py-8 text-xl"
          data-testid="rtw-hit"
        >
          Hit
        </KeypadButton>
        <KeypadButton
          variant="danger"
          onClick={() => handleGroupA(false)}
          disabled={disabled}
          className="py-8 text-xl"
          data-testid="rtw-miss"
        >
          Miss
        </KeypadButton>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-4" aria-label="RTW keypad">
      {([0, 1, 2, 3] as const).map((n) => (
        <KeypadButton
          key={n}
          variant={n === 0 ? 'danger' : 'number'}
          onClick={() => handleGroupB(n)}
          disabled={disabled}
          className="py-6"
          data-testid={`rtw-hits-${n}`}
        >
          {GROUP_B_LABELS[n]}
        </KeypadButton>
      ))}
    </div>
  );
}
