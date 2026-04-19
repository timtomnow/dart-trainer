import { z } from 'zod';

export const X01_GAME_ID = 'x01' as const;

export const X01StartScore = z.union([z.literal(301), z.literal(501), z.literal(701)]);
export type X01StartScore = z.infer<typeof X01StartScore>;

export const X01InRule = z.enum(['straight', 'double']);
export type X01InRule = z.infer<typeof X01InRule>;

export const X01OutRule = z.enum(['straight', 'double', 'masters']);
export type X01OutRule = z.infer<typeof X01OutRule>;

export const X01Config = z.object({
  startScore: X01StartScore,
  inRule: X01InRule,
  outRule: X01OutRule,
  legsToWin: z.number().int().min(1).max(9)
});

export type X01Config = z.infer<typeof X01Config>;

export const X01_DEFAULT_CONFIG: X01Config = {
  startScore: 501,
  inRule: 'straight',
  outRule: 'double',
  legsToWin: 1
};

export function parseX01Config(raw: unknown): X01Config {
  return X01Config.parse(raw);
}
