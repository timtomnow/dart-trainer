import { z } from 'zod';
import { X01Config } from '../x01/config';

export { X01Config } from '../x01/config';
export { x01Engine as x01vcEngine } from '../x01/engine';

export const X01VC_GAME_ID = 'x01vc' as const;

export const WhoGoesFirst = z.enum(['user', 'computer', 'alternate', 'random']);
export type WhoGoesFirst = z.infer<typeof WhoGoesFirst>;

/**
 * Superset of X01Config. The x01 engine reads only the X01Config fields;
 * the extra fields are consumed by the hook and play-setup screen.
 */
export const X01VCConfig = X01Config.extend({
  computerDifficulty: z.number().int().min(1).max(10),
  whoGoesFirst: WhoGoesFirst,
  /** ULID generated at session creation. Never stored in the profiles table. */
  computerParticipantId: z.string().min(1),
  /** Seed generated at session creation (Date.now()). Drives deterministic throws. */
  computerSeed: z.number().int()
});
export type X01VCConfig = z.infer<typeof X01VCConfig>;

export const X01VC_DEFAULT_CONFIG = {
  startScore: 501,
  inRule: 'straight',
  outRule: 'double',
  legsToWin: 1,
  computerDifficulty: 5,
  whoGoesFirst: 'user'
} as const satisfies Omit<X01VCConfig, 'computerParticipantId' | 'computerSeed'>;
