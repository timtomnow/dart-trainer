import { Dexie } from 'dexie';
import type {
  ListProfilesOptions,
  ListSessionsFilter,
  StorageAdapter,
  Unsubscribe
} from '../adapter';
import { DartTrainerDB } from './db';
import { runMigrations } from './migrations';
import { isInputEventType } from '@/domain/events';
import { newId } from '@/domain/ids';
import {
  APP_SETTINGS_ID,
  AppSettings,
  AppSettingsPatch,
  CreateProfileInput,
  CreateSessionInput,
  CURRENT_SCHEMA_VERSION,
  DerivedStats,
  GameEvent,
  PlayerProfile,
  ProfileName,
  Session,
  SessionStatus
} from '@/domain/schemas';
import type {
  BackupData,
  AppSettings as AppSettingsType,
  DerivedStats as DerivedStatsType,
  DerivedStatsScope,
  GameEvent as GameEventType,
  PlayerProfile as PlayerProfileType,
  Session as SessionType,
  SessionStatus as SessionStatusType
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

  async createSession(input: CreateSessionInput): Promise<SessionType> {
    const parsed = CreateSessionInput.parse(input);
    const now = this.nowIso();
    const session = Session.parse({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: this.genId(),
      gameModeId: parsed.gameModeId,
      gameConfig: parsed.gameConfig,
      participants: parsed.participants,
      status: 'in_progress',
      startedAt: parsed.startedAt ?? now,
      createdAt: now,
      updatedAt: now
    });
    await this.db.sessions.put(session);
    return session;
  }

  async getSession(id: string): Promise<SessionType | null> {
    const raw = await this.db.sessions.get(id);
    return raw ? Session.parse(raw) : null;
  }

  async listSessions(filter: ListSessionsFilter = {}): Promise<SessionType[]> {
    const all = await this.db.sessions.orderBy('startedAt').reverse().toArray();
    let parsed = all.map((s) => Session.parse(s));
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      parsed = parsed.filter((s) => statuses.includes(s.status));
    }
    if (filter.gameModeId) {
      parsed = parsed.filter((s) => s.gameModeId === filter.gameModeId);
    }
    if (filter.since) {
      parsed = parsed.filter((s) => s.startedAt >= filter.since!);
    }
    if (filter.until) {
      parsed = parsed.filter((s) => s.startedAt <= filter.until!);
    }
    if (filter.participantId) {
      const pid = filter.participantId;
      parsed = parsed.filter((s) => s.participants.includes(pid));
    }
    return parsed;
  }

  async updateSessionStatus(id: string, status: SessionStatusType): Promise<SessionType> {
    const parsedStatus = SessionStatus.parse(status);
    const current = await this.db.sessions.get(id);
    if (!current) throw new Error(`Session not found: ${id}`);
    const parsedCurrent = Session.parse(current);
    const next = Session.parse({
      ...parsedCurrent,
      status: parsedStatus,
      updatedAt: this.nowIso(),
      endedAt:
        parsedStatus === 'completed' ||
        parsedStatus === 'forfeited' ||
        parsedStatus === 'abandoned'
          ? this.nowIso()
          : parsedCurrent.endedAt
    });
    await this.db.sessions.put(next);
    return next;
  }

  async deleteSession(id: string): Promise<void> {
    await this.updateSessionStatus(id, 'deleted');
  }

  async discardSession(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.sessions, this.db.events, this.db.derivedStats],
      async () => {
        const eventRows = await this.db.events.where('sessionId').equals(id).toArray();
        if (eventRows.length > 0) {
          await this.db.events.bulkDelete(eventRows.map((r) => r.id));
        }
        await this.db.derivedStats.delete(['session', id]);
        await this.db.sessions.delete(id);
      }
    );
  }

  async appendEvent(event: GameEventType): Promise<GameEventType> {
    const parsed = GameEvent.parse(event);
    return this.db.transaction('rw', this.db.events, async () => {
      const last = await this.db.events
        .where('[sessionId+seq]')
        .between([parsed.sessionId, 0], [parsed.sessionId, Dexie.maxKey])
        .last();
      const expectedSeq = last ? last.seq + 1 : 0;
      if (parsed.seq !== expectedSeq) {
        throw new Error(
          `Non-monotonic event seq for session ${parsed.sessionId}: expected ${expectedSeq}, got ${parsed.seq}`
        );
      }
      await this.db.events.put(parsed);
      return parsed;
    });
  }

  async listEvents(sessionId: string): Promise<GameEventType[]> {
    const rows = await this.db.events
      .where('[sessionId+seq]')
      .between([sessionId, 0], [sessionId, Dexie.maxKey])
      .toArray();
    return rows.map((r) => GameEvent.parse(r));
  }

  async popLastInputEvent(sessionId: string): Promise<GameEventType | null> {
    return this.db.transaction('rw', this.db.events, async () => {
      const rows = await this.db.events
        .where('[sessionId+seq]')
        .between([sessionId, 0], [sessionId, Dexie.maxKey])
        .reverse()
        .toArray();
      const target = rows.find((r) => isInputEventType(r.type));
      if (!target) return null;
      await this.db.events.delete(target.id);
      return GameEvent.parse(target);
    });
  }

  async getDerivedStats(scope: DerivedStatsScope, key: string): Promise<DerivedStatsType | null> {
    const raw = await this.db.derivedStats.get([scope, key]);
    return raw ? DerivedStats.parse(raw) : null;
  }

  async putDerivedStats(stats: DerivedStatsType): Promise<void> {
    const parsed = DerivedStats.parse(stats);
    await this.db.derivedStats.put(parsed);
  }

  async replaceAllData(data: BackupData): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.appSettings, this.db.profiles, this.db.sessions, this.db.events, this.db.derivedStats],
      async () => {
        await this.db.appSettings.clear();
        await this.db.profiles.clear();
        await this.db.sessions.clear();
        await this.db.events.clear();
        await this.db.derivedStats.clear();
        if (data.settings) await this.db.appSettings.put(data.settings);
        if (data.profiles.length) await this.db.profiles.bulkPut(data.profiles);
        if (data.sessions.length) await this.db.sessions.bulkPut(data.sessions);
        if (data.events.length) await this.db.events.bulkPut(data.events);
        if (data.derivedStats.length) await this.db.derivedStats.bulkPut(data.derivedStats);
      }
    );
    const settings = data.settings ?? null;
    await this.emitAppSettings(settings);
    await this.emitProfiles();
    await this.emitActiveProfile(settings?.activeProfileId ?? null);
  }

  async deleteAllData(): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.appSettings, this.db.profiles, this.db.sessions, this.db.events, this.db.derivedStats],
      async () => {
        await this.db.profiles.clear();
        await this.db.sessions.clear();
        await this.db.events.clear();
        await this.db.derivedStats.clear();
        const existing = await this.db.appSettings.toCollection().first();
        if (existing?.activeProfileId) {
          await this.db.appSettings.put({ ...existing, activeProfileId: null });
        }
      }
    );
    const settings = await this.getAppSettings();
    await this.emitAppSettings(settings);
    await this.emitProfiles();
    await this.emitActiveProfile(null);
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
