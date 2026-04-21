import { cricketEngine } from './cricket';
import type { GameEngine } from './engine';
import { freeformEngine } from './freeform';
import { rtwEngine } from './rtw';
import { rtwScoringEngine } from './rtw-scoring';
import { x01Engine } from './x01';

export const GAME_REGISTRY = {
  freeform: freeformEngine,
  x01: x01Engine,
  cricket: cricketEngine,
  rtw: rtwEngine,
  'rtw-scoring': rtwScoringEngine
} as const;

export type GameModeId = keyof typeof GAME_REGISTRY;

type AnyEngine = GameEngine<unknown, unknown, unknown, unknown>;

export function getEngine(id: string): AnyEngine | null {
  if (id in GAME_REGISTRY) {
    return GAME_REGISTRY[id as GameModeId] as unknown as AnyEngine;
  }
  return null;
}
