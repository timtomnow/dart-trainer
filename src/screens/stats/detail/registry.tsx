import type { ComponentType } from 'react';
import * as checkout from './checkout';
import * as cricket from './cricket';
import * as rtw from './rtw';
import * as rtwScoring from './rtw-scoring';
import type { StatsPanelProps } from './shared';
import * as x01 from './x01';
import * as x01vc from './x01vc';

export type StatsGameMeta = {
  id: string;
  label: string;
  Panel: ComponentType<StatsPanelProps>;
};

export const STATS_GAMES: StatsGameMeta[] = [
  { id: 'x01', label: 'X01', Panel: x01.Panel },
  { id: 'x01vc', label: 'X01 vs Computer', Panel: x01vc.Panel },
  { id: 'cricket', label: 'Cricket', Panel: cricket.Panel },
  { id: 'rtw', label: 'Round the World', Panel: rtw.Panel },
  { id: 'rtw-scoring', label: 'RTW Scoring', Panel: rtwScoring.Panel },
  { id: 'checkout', label: 'Checkout Practice', Panel: checkout.Panel }
];

export function getStatsGame(id: string | undefined): StatsGameMeta | undefined {
  return STATS_GAMES.find((g) => g.id === id);
}
