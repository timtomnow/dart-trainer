import type {
  AppSettings,
  AppSettingsPatch,
  CreateProfileInput,
  PlayerProfile
} from '@/domain/types';

export type Unsubscribe = () => void;

export type ListProfilesOptions = {
  includeArchived?: boolean;
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

  subscribeAppSettings(cb: (settings: AppSettings | null) => void): Unsubscribe;
  subscribeProfiles(
    cb: (profiles: PlayerProfile[]) => void,
    options?: ListProfilesOptions
  ): Unsubscribe;
  subscribeActiveProfile(cb: (profile: PlayerProfile | null) => void): Unsubscribe;
}
