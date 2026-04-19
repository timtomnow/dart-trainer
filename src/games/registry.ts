import type { GameEngine } from './engine';
import { freeformEngine } from './freeform';

export const GAME_REGISTRY = {
  freeform: freeformEngine
} as const;

export type GameModeId = keyof typeof GAME_REGISTRY;

type AnyEngine = GameEngine<unknown, unknown, unknown, unknown>;

export function getEngine(id: string): AnyEngine | null {
  if (id in GAME_REGISTRY) {
    return GAME_REGISTRY[id as GameModeId] as unknown as AnyEngine;
  }
  return null;
}
