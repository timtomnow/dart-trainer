import { createElement, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Celebration } from './Celebration';
import { type CelebrationTier, playCelebration } from '@/lib/feedback';

type Active = { tier: CelebrationTier; key: number };

export type UseCelebrationResult = {
  /** Fire a celebration. The visual always plays; sound plays only when enabled. */
  celebrate: (tier: CelebrationTier, soundEnabled: boolean) => void;
  /** Render this somewhere in the tree (it positions itself fixed). */
  node: ReactNode;
};

export function useCelebration(): UseCelebrationResult {
  const [active, setActive] = useState<Active | null>(null);

  const celebrate = useCallback((tier: CelebrationTier, soundEnabled: boolean) => {
    playCelebration(tier, soundEnabled);
    setActive((prev) => ({ tier, key: (prev?.key ?? 0) + 1 }));
  }, []);

  const node = active
    ? createElement(Celebration, {
        key: active.key,
        tier: active.tier,
        onDone: () => setActive(null)
      })
    : null;

  return { celebrate, node };
}
