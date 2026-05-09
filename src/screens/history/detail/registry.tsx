import type { ComponentType } from 'react';
import * as checkout from './checkout';
import * as cricket from './cricket';
import * as rtw from './rtw';
import * as rtwScoring from './rtw-scoring';
import * as x01 from './x01';
import * as x01vc from './x01vc';
import type { GameEvent, Session } from '@/domain/types';

export type DetailSectionProps = {
  session: Session;
  events: GameEvent[];
  participantNames: Record<string, string>;
};

export type ModeDetailModule = {
  ConfigSummary: ComponentType<DetailSectionProps>;
  CustomContent: ComponentType<DetailSectionProps>;
};

export const MODE_DETAIL_REGISTRY: Record<string, ModeDetailModule> = {
  x01,
  x01vc,
  cricket,
  rtw,
  'rtw-scoring': rtwScoring,
  checkout
};
