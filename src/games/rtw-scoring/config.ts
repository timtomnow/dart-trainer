import { z } from 'zod';

export const RTW_SCORING_GAME_ID = 'rtw-scoring' as const;

// Config is structurally identical to RtwConfig — defined separately to keep modules independent
export const RtwScoringGameType = z.enum([
  'Single',
  'Single Inner',
  'Single Outer',
  'Double',
  'Triple'
]);
export type RtwScoringGameType = z.infer<typeof RtwScoringGameType>;

export const RtwScoringMode = z.enum([
  'Hit once',
  '3 darts per target',
  '1-dart per target',
  '3-darts until hit 1',
  '3-darts until hit 2',
  '3-darts until hit 3'
]);
export type RtwScoringMode = z.infer<typeof RtwScoringMode>;

export const RtwScoringOrder = z.enum([
  '1-20',
  '20-1',
  'Clockwise',
  'Counter Clockwise',
  'Random'
]);
export type RtwScoringOrder = z.infer<typeof RtwScoringOrder>;

export const RtwScoringConfig = z.object({
  gameType: RtwScoringGameType,
  mode: RtwScoringMode,
  order: RtwScoringOrder,
  excludeBull: z.boolean(),
  customSequence: z.array(z.number().int().positive()).optional()
});
export type RtwScoringConfig = z.infer<typeof RtwScoringConfig>;

export const RTW_SCORING_DEFAULT_CONFIG: RtwScoringConfig = {
  gameType: 'Single',
  mode: 'Hit once',
  order: '1-20',
  excludeBull: false
};

export function parseRtwScoringConfig(raw: unknown): RtwScoringConfig {
  return RtwScoringConfig.parse(raw);
}
