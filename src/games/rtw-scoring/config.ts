import { z } from 'zod';

export const RTW_SCORING_GAME_ID = 'rtw-scoring' as const;

export const RtwScoringOrder = z.enum([
  '1-20',
  '20-1',
  'Clockwise',
  'Counter Clockwise',
  'Random'
]);
export type RtwScoringOrder = z.infer<typeof RtwScoringOrder>;

export const RtwScoringConfig = z.object({
  order: RtwScoringOrder,
  customSequence: z.array(z.number().int().positive()).optional()
});
export type RtwScoringConfig = z.infer<typeof RtwScoringConfig>;

export const RTW_SCORING_DEFAULT_CONFIG: RtwScoringConfig = {
  order: '1-20'
};

export function parseRtwScoringConfig(raw: unknown): RtwScoringConfig {
  return RtwScoringConfig.parse(raw);
}
