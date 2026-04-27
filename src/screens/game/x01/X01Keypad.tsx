import { useState } from 'react';
import type { KeypadLayout, ThrowSegment } from '@/domain/types';
import type { UiFeedbackPrefs } from '@/hooks';
import { dartFeedback } from '@/lib/feedback';
import { KeypadButton } from '@/ui/primitives';

type Multiplier = 'S' | 'D' | 'T';

type Props = {
  onDart: (segment: ThrowSegment, value: number) => void;
  disabled: boolean;
  layout?: KeypadLayout;
  prefs?: UiFeedbackPrefs;
};

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

// Clockwise from 20 at top. Even indices → outer ring, odd indices → inner ring.
const DARTBOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;

// Outer ring: 10 numbers at r=42%, 15% buttons, 36° apart starting at 0° (top)
// Inner ring: 10 numbers at r=25%, 13% buttons, 36° apart starting at 18° (half-step offset)
const OUTER_R = 42;
const INNER_R = 25;
const OUTER_BTN = 15;
const INNER_BTN = 13;
const BULL_BTN = 11;

export function X01Keypad({ onDart, disabled, layout = 'sequential', prefs }: Props) {
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

  const multiplierRow = (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Multiplier">
      {(['S', 'D', 'T'] as const).map((m) => (
        <KeypadButton
          key={m}
          variant={multiplier === m ? 'multiplier-active' : 'multiplier'}
          role="radio"
          aria-checked={multiplier === m}
          onClick={() => setMultiplier(m)}
          disabled={disabled}
          data-testid={`x01-mult-${m}`}
        >
          {m === 'S' ? 'Single' : m === 'D' ? 'Double' : 'Triple'}
        </KeypadButton>
      ))}
    </div>
  );

  if (layout === 'dartboard') {
    return (
      <div className="mt-4" aria-label="X01 keypad">
        {multiplierRow}
        {/* Ring area + Miss sit side by side. Ring fills 3/4, Miss fills 1/4. */}
        <div className="mt-3 flex gap-2">
          <div className="min-w-0 flex-[3]">
            <div className="relative aspect-square w-full">
              {DARTBOARD_ORDER.map((n, i) => {
                const isOuter = i % 2 === 0;
                const ringIdx = isOuter ? i / 2 : (i - 1) / 2;
                const angleDeg = isOuter ? ringIdx * 36 : 18 + ringIdx * 36;
                const angleRad = (angleDeg * Math.PI) / 180;
                const r = isOuter ? OUTER_R : INNER_R;
                const btnSize = isOuter ? OUTER_BTN : INNER_BTN;
                const left = 50 + r * Math.sin(angleRad);
                const top = 50 - r * Math.cos(angleRad);
                return (
                  <button
                    key={n}
                    type="button"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${btnSize}%`,
                      height: `${btnSize}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    className="absolute flex items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-200 active:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    onClick={() => pickNumber(n)}
                    disabled={disabled}
                    data-testid={`x01-num-${n}`}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                type="button"
                style={{
                  left: '50%',
                  top: '50%',
                  width: `${BULL_BTN}%`,
                  height: `${BULL_BTN}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                className="absolute flex items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-400 active:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={pickBull}
                disabled={disabled}
                data-testid="x01-bull"
              >
                Bull
              </button>
            </div>
          </div>
          {/* Miss: full height of the ring, 1/4 width */}
          <div className="flex flex-1 flex-col">
            <button
              type="button"
              className="flex-1 rounded-lg bg-red-600 text-lg font-semibold text-white shadow-sm transition hover:bg-red-500 active:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-700"
              onClick={pickMiss}
              disabled={disabled}
              data-testid="x01-miss"
            >
              Miss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4" aria-label="X01 keypad">
      {multiplierRow}
      <div className="mt-2 grid grid-cols-5 gap-2">
        {NUMBERS.map((n) => (
          <KeypadButton
            key={n}
            onClick={() => pickNumber(n)}
            disabled={disabled}
            data-testid={`x01-num-${n}`}
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
          data-testid="x01-bull"
        >
          {multiplier === 'D' ? 'Bull (50)' : 'Bull (25)'}
        </KeypadButton>
        <KeypadButton
          variant="danger"
          onClick={pickMiss}
          disabled={disabled}
          data-testid="x01-miss"
        >
          Miss
        </KeypadButton>
      </div>
    </div>
  );
}
