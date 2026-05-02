import { useState } from 'react';
import type { KeypadLayout, ThrowSegment } from '@/domain/types';
import type { CheckoutOutRule } from '@/games/checkout';
import type { UiFeedbackPrefs } from '@/hooks';
import { dartFeedback, vibrateTap } from '@/lib/feedback';
import { KeypadButton } from '@/ui/primitives';

type Multiplier = 'S' | 'D' | 'T';

type Props = {
  onDart: (segment: ThrowSegment, value: number) => void;
  disabled: boolean;
  remainingInAttempt: number;
  outRule: CheckoutOutRule;
  prefs?: UiFeedbackPrefs;
  layout?: KeypadLayout;
};

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

const DARTBOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;
const OUTER_R = 42;
const INNER_R = 25;
const OUTER_BTN = 15;
const INNER_BTN = 13;
const BULL_BTN = 11;

export function CheckoutKeypad({ onDart, disabled, remainingInAttempt, outRule, prefs, layout = 'sequential' }: Props) {
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

  const multiplierRow = (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Multiplier">
      {(['S', 'D', 'T'] as const).map((m) => (
        <KeypadButton
          key={m}
          variant={multiplier === m ? 'multiplier-active' : 'multiplier'}
          role="radio"
          aria-checked={multiplier === m}
          onClick={() => { vibrateTap(prefs?.haptics ?? false); setMultiplier(m); }}
          disabled={disabled}
          data-testid={`checkout-mult-${m}`}
        >
          {m === 'S' ? 'Single' : m === 'D' ? 'Double' : 'Triple'}
        </KeypadButton>
      ))}
    </div>
  );

  if (layout === 'dartboard') {
    return (
      <div className="mt-4" aria-label="Checkout keypad">
        {multiplierRow}
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
                const finisher = isFinisher(n);
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
                    className={`absolute flex items-center justify-center rounded-full text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      finisher
                        ? 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => pickNumber(n)}
                    disabled={disabled}
                    data-testid={`checkout-num-${n}`}
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
                className={`absolute flex items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isBullFinisher()
                    ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
                    : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600'
                }`}
                onClick={pickBull}
                disabled={disabled}
                data-testid="checkout-bull"
              >
                Bull
              </button>
            </div>
          </div>
          <div className="flex flex-1 flex-col">
            <button
              type="button"
              className="flex-1 rounded-lg bg-red-600 text-lg font-semibold text-white shadow-sm transition hover:bg-red-500 active:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-700"
              onClick={pickMiss}
              disabled={disabled}
              data-testid="checkout-miss"
            >
              Miss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4" aria-label="Checkout keypad">
      {multiplierRow}
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
