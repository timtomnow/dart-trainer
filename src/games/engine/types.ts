import type { GameEvent } from '@/domain/types';

export type EngineSeeds = {
  now: () => string;
  newId: () => string;
};

export type LegResult = { legIndex: number; winnerParticipantId?: string };
export type SessionResult = { status: 'completed' | 'forfeited' };

export type EngineError = { code: string; message: string };

export type EngineReduceResult<TState> = {
  state: TState;
  emit: GameEvent[];
  pop: string[];
  error?: EngineError;
};

export interface GameEngine<TConfig, TState, TAction, TViewModel = unknown> {
  readonly id: string;
  init(
    config: TConfig,
    participantIds: string[],
    sessionId: string,
    seeds: EngineSeeds
  ): TState;
  reduce(
    state: TState,
    action: TAction,
    seeds: EngineSeeds
  ): EngineReduceResult<TState>;
  isLegOver(state: TState): LegResult | null;
  isSessionOver(state: TState): SessionResult | null;
  view(state: TState): TViewModel;
  replay(
    events: GameEvent[],
    config: TConfig,
    participantIds: string[],
    sessionId: string
  ): TState;
}
