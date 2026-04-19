import type { ListProfilesOptions, StorageAdapter, Unsubscribe } from '../adapter';
import { DartTrainerDB } from './db';
import { runMigrations } from './migrations';
import { newId } from '@/domain/ids';
import {
  APP_SETTINGS_ID,
  AppSettings,
  AppSettingsPatch,
  CreateProfileInput,
  CURRENT_SCHEMA_VERSION,
  PlayerProfile,
  ProfileName
} from '@/domain/schemas';
import type {
  AppSettings as AppSettingsType,
  PlayerProfile as PlayerProfileType
} from '@/domain/types';

export type DexieAdapterDeps = {
  db?: DartTrainerDB;
  newId?: () => string;
  now?: () => Date;
  appVersion?: string;
};

type AppSettingsListener = (s: AppSettingsType | null) => void;
type ProfilesListener = (ps: PlayerProfileType[]) => void;
type ActiveProfileListener = (p: PlayerProfileType | null) => void;

export class DexieStorageAdapter implements StorageAdapter {
  private readonly db: DartTrainerDB;
  private readonly genId: () => string;
  private readonly nowFn: () => Date;
  private readonly appVersion: string;
  private initialized = false;

  private readonly appSettingsListeners = new Set<AppSettingsListener>();
  private readonly profilesListeners = new Map<ProfilesListener, ListProfilesOptions>();
  private readonly activeProfileListeners = new Set<ActiveProfileListener>();

  constructor(deps: DexieAdapterDeps = {}) {
    this.db = deps.db ?? new DartTrainerDB();
    this.genId = deps.newId ?? newId;
    this.nowFn = deps.now ?? (() => new Date());
    this.appVersion = deps.appVersion ?? '0.0.0';
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!this.db.isOpen()) await this.db.open();
    await runMigrations(this.db);
    await this.ensureAppSettings();
    this.initialized = true;
  }

  private nowIso(): string {
    return this.nowFn().toISOString();
  }

  private async ensureAppSettings(): Promise<AppSettingsType> {
    const existing = await this.db.appSettings.get(APP_SETTINGS_ID);
    if (existing) return AppSettings.parse(existing);
    const now = this.nowIso();
    const fresh = AppSettings.parse({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: APP_SETTINGS_ID,
      appVersion: this.appVersion,
      activeProfileId: null,
      firstLaunchAt: now,
      updatedAt: now
    });
    await this.db.appSettings.put(fresh);
    return fresh;
  }

  async getAppSettings(): Promise<AppSettingsType | null> {
    const raw = await this.db.appSettings.get(APP_SETTINGS_ID);
    return raw ? AppSettings.parse(raw) : null;
  }

  async updateAppSettings(patch: AppSettingsPatch): Promise<AppSettingsType> {
    const parsedPatch = AppSettingsPatch.parse(patch);
    const current = await this.ensureAppSettings();
    const next = AppSettings.parse({
      ...current,
      ...parsedPatch,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: APP_SETTINGS_ID,
      updatedAt: this.nowIso()
    });
    await this.db.appSettings.put(next);
    await this.emitAppSettings(next);
    return next;
  }

  async listProfiles(options: ListProfilesOptions = {}): Promise<PlayerProfileType[]> {
    const all = await this.db.profiles.orderBy('createdAt').toArray();
    const parsed = all.map((p) => PlayerProfile.parse(p));
    return options.includeArchived ? parsed : parsed.filter((p) => !p.archived);
  }

  async getProfile(id: string): Promise<PlayerProfileType | null> {
    const raw = await this.db.profiles.get(id);
    return raw ? PlayerProfile.parse(raw) : null;
  }

  async createProfile(input: CreateProfileInput): Promise<PlayerProfileType> {
    const parsed = CreateProfileInput.parse(input);
    const now = this.nowIso();
    const profile = PlayerProfile.parse({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: this.genId(),
      name: parsed.name,
      handedness: parsed.handedness,
      avatarColor: parsed.avatarColor,
      archived: false,
      createdAt: now,
      updatedAt: now
    });
    await this.db.profiles.put(profile);

    const settings = await this.ensureAppSettings();
    if (settings.activeProfileId === null) {
      await this.setActiveProfile(profile.id);
    }
    await this.emitProfiles();
    return profile;
  }

  async renameProfile(id: string, name: string): Promise<PlayerProfileType> {
    const nextName = ProfileName.parse(name);
    const updated = await this.mutateProfile(id, (p) => ({ ...p, name: nextName }));
    return updated;
  }

  async archiveProfile(id: string): Promise<PlayerProfileType> {
    const updated = await this.mutateProfile(id, (p) => ({ ...p, archived: true }));
    const settings = await this.ensureAppSettings();
    if (settings.activeProfileId === id) {
      await this.setActiveProfile(null);
    }
    return updated;
  }

  async restoreProfile(id: string): Promise<PlayerProfileType> {
    return this.mutateProfile(id, (p) => ({ ...p, archived: false }));
  }

  async setActiveProfile(id: string | null): Promise<void> {
    if (id !== null) {
      const target = await this.db.profiles.get(id);
      if (!target) throw new Error(`Profile not found: ${id}`);
      if (target.archived) throw new Error(`Profile is archived: ${id}`);
    }
    const current = await this.ensureAppSettings();
    const next = AppSettings.parse({
      ...current,
      activeProfileId: id,
      updatedAt: this.nowIso()
    });
    await this.db.appSettings.put(next);
    await this.emitAppSettings(next);
    await this.emitActiveProfile(next.activeProfileId);
  }

  subscribeAppSettings(cb: AppSettingsListener): Unsubscribe {
    this.appSettingsListeners.add(cb);
    void this.getAppSettings().then((s) => cb(s));
    return () => this.appSettingsListeners.delete(cb);
  }

  subscribeProfiles(cb: ProfilesListener, options: ListProfilesOptions = {}): Unsubscribe {
    this.profilesListeners.set(cb, options);
    void this.listProfiles(options).then((ps) => cb(ps));
    return () => {
      this.profilesListeners.delete(cb);
    };
  }

  subscribeActiveProfile(cb: ActiveProfileListener): Unsubscribe {
    this.activeProfileListeners.add(cb);
    void this.getActiveProfile().then((p) => cb(p));
    return () => this.activeProfileListeners.delete(cb);
  }

  private async mutateProfile(
    id: string,
    mutator: (p: PlayerProfileType) => PlayerProfileType
  ): Promise<PlayerProfileType> {
    const current = await this.db.profiles.get(id);
    if (!current) throw new Error(`Profile not found: ${id}`);
    const parsed = PlayerProfile.parse(current);
    const next = PlayerProfile.parse({
      ...mutator(parsed),
      updatedAt: this.nowIso()
    });
    await this.db.profiles.put(next);
    await this.emitProfiles();
    const settings = await this.ensureAppSettings();
    if (settings.activeProfileId === id) {
      await this.emitActiveProfile(id);
    }
    return next;
  }

  private async getActiveProfile(): Promise<PlayerProfileType | null> {
    const settings = await this.getAppSettings();
    if (!settings?.activeProfileId) return null;
    return this.getProfile(settings.activeProfileId);
  }

  private async emitAppSettings(next: AppSettingsType | null): Promise<void> {
    for (const listener of this.appSettingsListeners) listener(next);
  }

  private async emitProfiles(): Promise<void> {
    if (this.profilesListeners.size === 0) return;
    const unfiltered = await this.listProfiles({ includeArchived: true });
    const active = unfiltered.filter((p) => !p.archived);
    for (const [listener, opts] of this.profilesListeners) {
      listener(opts.includeArchived ? unfiltered : active);
    }
  }

  private async emitActiveProfile(id: string | null): Promise<void> {
    if (this.activeProfileListeners.size === 0) return;
    const next = id ? await this.getProfile(id) : null;
    for (const listener of this.activeProfileListeners) listener(next);
  }
}
