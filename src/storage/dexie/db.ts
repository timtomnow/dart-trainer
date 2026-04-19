import { Dexie, type Table } from 'dexie';
import type { AppSettings, PlayerProfile } from '@/domain/types';

export const DB_NAME = 'dart_trainer';
export const DB_CURRENT_VERSION = 1;

export class DartTrainerDB extends Dexie {
  appSettings!: Table<AppSettings, string>;
  profiles!: Table<PlayerProfile, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      appSettings: 'id',
      profiles: 'id, name, archived, createdAt'
    });
  }
}
