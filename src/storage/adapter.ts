import type {
  AppSettings,
  AppSettingsPatch,
  BackupData,
  CreateProfileInput,
  CreateSessionInput,
  DerivedStats,
  DerivedStatsScope,
  GameEvent,
  PlayerProfile,
  Session,
  SessionStatus
} from '@/domain/types';

export type Unsubscribe = () => void;

export type ListProfilesOptions = {
  includeArchived?: boolean;
};

export type ListSessionsFilter = {
  status?: SessionStatus | SessionStatus[];
  gameModeId?: string;
  since?: string;
  until?: string;
  participantId?: string;
};

export interface StorageAdapter {
  init(): Promise<void>;

  getAppSettings(): Promise<AppSettings | null>;
  updateAppSettings(patch: AppSettingsPatch): Promise<AppSettings>;

  listProfiles(options?: ListProfilesOptions): Promise<PlayerProfile[]>;
  getProfile(id: string): Promise<PlayerProfile | null>;
  createProfile(input: CreateProfileInput): Promise<PlayerProfile>;
  renameProfile(id: string, name: string): Promise<PlayerProfile>;
  archiveProfile(id: string): Promise<PlayerProfile>;
  restoreProfile(id: string): Promise<PlayerProfile>;
  setActiveProfile(id: string | null): Promise<void>;

  createSession(input: CreateSessionInput): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  listSessions(filter?: ListSessionsFilter): Promise<Session[]>;
  updateSessionStatus(id: string, status: SessionStatus): Promise<Session>;
  deleteSession(id: string): Promise<void>;
  discardSession(id: string): Promise<void>;

  appendEvent(event: GameEvent): Promise<GameEvent>;
  listEvents(sessionId: string): Promise<GameEvent[]>;
  popLastInputEvent(sessionId: string): Promise<GameEvent | null>;

  getDerivedStats(scope: DerivedStatsScope, key: string): Promise<DerivedStats | null>;
  putDerivedStats(stats: DerivedStats): Promise<void>;

  replaceAllData(data: BackupData): Promise<void>;

  subscribeAppSettings(cb: (settings: AppSettings | null) => void): Unsubscribe;
  subscribeProfiles(
    cb: (profiles: PlayerProfile[]) => void,
    options?: ListProfilesOptions
  ): Unsubscribe;
  subscribeActiveProfile(cb: (profile: PlayerProfile | null) => void): Unsubscribe;
}
