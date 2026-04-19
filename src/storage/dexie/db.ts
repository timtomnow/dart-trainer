import { Dexie, type Table } from 'dexie';
import type { AppSettings, DerivedStats, GameEvent, PlayerProfile, Session } from '@/domain/types';

export const DB_NAME = 'dart_trainer';
export const DB_CURRENT_VERSION = 3;

export class DartTrainerDB extends Dexie {
  appSettings!: Table<AppSettings, string>;
  profiles!: Table<PlayerProfile, string>;
  sessions!: Table<Session, string>;
  events!: Table<GameEvent, string>;
  derivedStats!: Table<DerivedStats, [string, string]>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      appSettings: 'id',
      profiles: 'id, name, archived, createdAt'
    });
    this.version(2).stores({
      appSettings: 'id',
      profiles: 'id, name, archived, createdAt',
      sessions: 'id, status, startedAt, gameModeId',
      events: 'id, &[sessionId+seq], sessionId, type, timestamp'
    });
    this.version(3).stores({
      appSettings: 'id',
      profiles: 'id, name, archived, createdAt',
      sessions: 'id, status, startedAt, gameModeId',
      events: 'id, &[sessionId+seq], sessionId, type, timestamp',
      derivedStats: '[scope+key], scope'
    });
  }
}
