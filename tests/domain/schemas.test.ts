import { describe, expect, it } from 'vitest';
import {
  AppSettings,
  BackupManifest,
  CURRENT_SCHEMA_VERSION,
  DerivedStats,
  GameEvent,
  Leg,
  PlayerProfile,
  ProfilePreferences,
  Session,
  Throw,
  Turn
} from '@/domain/schemas';

const ULID_A = '01JARVQZAAAAAAAAAAAAAAAAAA';
const ULID_B = '01JARVQZBBBBBBBBBBBBBBBBBB';
const ULID_C = '01JARVQZCCCCCCCCCCCCCCCCCC';
const ULID_D = '01JARVQZDDDDDDDDDDDDDDDDDD';
const ISO = '2026-04-18T00:00:00.000Z';

describe('domain schemas', () => {
  describe('AppSettings', () => {
    const valid = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: 'app' as const,
      appVersion: '1.0.0',
      activeProfileId: ULID_A,
      firstLaunchAt: ISO,
      updatedAt: ISO
    };

    it('round-trips a valid record', () => {
      expect(AppSettings.parse(valid)).toEqual(valid);
    });

    it('accepts null activeProfileId', () => {
      expect(AppSettings.parse({ ...valid, activeProfileId: null }).activeProfileId).toBeNull();
    });

    it('rejects unknown schemaVersion', () => {
      expect(() => AppSettings.parse({ ...valid, schemaVersion: 2 })).toThrow();
    });

    it('rejects wrong id', () => {
      expect(() => AppSettings.parse({ ...valid, id: 'nope' })).toThrow();
    });
  });

  describe('PlayerProfile', () => {
    const valid = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: ULID_A,
      name: 'Tom',
      archived: false,
      createdAt: ISO,
      updatedAt: ISO
    };

    it('round-trips a valid record', () => {
      expect(PlayerProfile.parse(valid)).toEqual(valid);
    });

    it('rejects empty name', () => {
      expect(() => PlayerProfile.parse({ ...valid, name: '' })).toThrow();
    });

    it('rejects >32-char name', () => {
      expect(() => PlayerProfile.parse({ ...valid, name: 'x'.repeat(33) })).toThrow();
    });

    it('rejects bad ULID', () => {
      expect(() => PlayerProfile.parse({ ...valid, id: 'not-ulid' })).toThrow();
    });
  });

  describe('ProfilePreferences', () => {
    it('round-trips and accepts X01 start enum', () => {
      const v = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        profileId: ULID_A,
        defaultX01Start: 501 as const
      };
      expect(ProfilePreferences.parse(v)).toEqual(v);
    });

    it('rejects invalid X01 start', () => {
      expect(() =>
        ProfilePreferences.parse({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          profileId: ULID_A,
          defaultX01Start: 401
        })
      ).toThrow();
    });
  });

  describe('Session', () => {
    const valid = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: ULID_A,
      gameModeId: 'x01',
      gameConfig: { start: 501 },
      participants: [ULID_B],
      status: 'in_progress' as const,
      startedAt: ISO,
      createdAt: ISO,
      updatedAt: ISO
    };

    it('round-trips a valid record', () => {
      expect(Session.parse(valid)).toEqual(valid);
    });

    it('requires at least one participant', () => {
      expect(() => Session.parse({ ...valid, participants: [] })).toThrow();
    });
  });

  describe('Leg / Turn / Throw', () => {
    it('Leg round-trips', () => {
      const v = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id: ULID_A,
        sessionId: ULID_B,
        index: 0,
        startedAt: ISO
      };
      expect(Leg.parse(v)).toEqual(v);
    });

    it('Turn round-trips', () => {
      const v = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id: ULID_A,
        legId: ULID_B,
        profileId: ULID_C,
        index: 0,
        startedAt: ISO
      };
      expect(Turn.parse(v)).toEqual(v);
    });

    it('Throw rejects value out of range', () => {
      const base = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id: ULID_A,
        turnId: ULID_B,
        index: 0 as const,
        segment: 'T' as const,
        value: 60,
        timestamp: ISO
      };
      expect(Throw.parse(base)).toEqual(base);
      expect(() => Throw.parse({ ...base, value: 61 })).toThrow();
      expect(() => Throw.parse({ ...base, segment: 'XX' })).toThrow();
    });
  });

  describe('GameEvent', () => {
    it('requires non-negative seq', () => {
      const valid = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id: ULID_A,
        sessionId: ULID_B,
        seq: 0,
        type: 'throw' as const,
        payload: { value: 60 },
        timestamp: ISO
      };
      expect(GameEvent.parse(valid)).toEqual(valid);
      expect(() => GameEvent.parse({ ...valid, seq: -1 })).toThrow();
    });

    it('accepts forfeit type', () => {
      const v = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id: ULID_A,
        sessionId: ULID_B,
        seq: 5,
        type: 'forfeit' as const,
        payload: {},
        timestamp: ISO
      };
      expect(GameEvent.parse(v).type).toBe('forfeit');
    });
  });

  describe('DerivedStats', () => {
    it('round-trips', () => {
      const v = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        scope: 'session' as const,
        key: ULID_A,
        sourceEventSeqMax: 42
      };
      expect(DerivedStats.parse(v)).toEqual(v);
    });
  });

  describe('BackupManifest', () => {
    it('round-trips an empty snapshot', () => {
      const v = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        appVersion: '1.0.0',
        exportedAt: ISO,
        deviceLabel: 'Test Device',
        contentHash: 'deadbeef',
        counts: {
          profiles: 0,
          profilePrefs: 0,
          sessions: 0,
          events: 0,
          derivedStats: 0,
          drills: 0
        },
        data: {
          settings: null,
          profiles: [],
          profilePrefs: [],
          sessions: [],
          events: [],
          derivedStats: [],
          drills: []
        }
      };
      expect(BackupManifest.parse(v)).toEqual(v);
    });

    it('rejects a stale schemaVersion', () => {
      expect(() =>
        BackupManifest.parse({
          schemaVersion: 0,
          appVersion: '1.0.0',
          exportedAt: ISO,
          deviceLabel: 'x',
          contentHash: 'x',
          counts: {
            profiles: 0,
            profilePrefs: 0,
            sessions: 0,
            events: 0,
            derivedStats: 0,
            drills: 0
          },
          data: {
            settings: null,
            profiles: [],
            profilePrefs: [],
            sessions: [],
            events: [],
            derivedStats: [],
            drills: []
          }
        })
      ).toThrow();
    });
  });

  it('ULIDs cross-reference across types', () => {
    const ids = [ULID_A, ULID_B, ULID_C, ULID_D];
    expect(new Set(ids).size).toBe(4);
  });
});
