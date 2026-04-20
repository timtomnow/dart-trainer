import { z } from 'zod';

export const CRICKET_GAME_ID = 'cricket' as const;

export const CricketConfig = z.object({
  legsToWin: z.number().int().min(1).max(9)
});

export type CricketConfig = z.infer<typeof CricketConfig>;

export const CRICKET_DEFAULT_CONFIG: CricketConfig = {
  legsToWin: 1
};

export function parseCricketConfig(raw: unknown): CricketConfig {
  return CricketConfig.parse(raw);
}
