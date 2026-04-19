import { describe, expect, it } from 'vitest';
import type { DerivedStats } from '@/domain/types';
import {
  isCacheStale,
  sessionCacheKey,
  statsFromRecord,
  statsToRecord
} from '@/stats/cache';
import type { X01SessionStats } from '@/stats/types';

const SESSION_ID = '01J0000000000000000000001A';

const SAMPLE_STATS: X01SessionStats = {
  threeDartAvg: 60,
  firstNineAvg: 55,
  checkoutPct: 0.5,
  dartsThrown: 27,
  count180: 0,
  count171plus: 0,
  count160plus: 0,
  count140plus: 1,
  count120plus: 2,
  count100plus: 3,
  count80plus: 6,
  count60plus: 9,
  highestTurnScore: 140,
  highestCheckout: 32,
  shortestLeg: 27,
  busts: 1,
  durationMs: 120000
};

function makeCachedRecord(seqMax: number): DerivedStats {
  return {
    schemaVersion: 1,
    scope: 'session',
    key: sessionCacheKey(SESSION_ID),
    sourceEventSeqMax: seqMax,
    average: 60,
    computedAt: new Date().toISOString(),
    data: SAMPLE_STATS as unknown as Record<string, unknown>
  };
}

describe('isCacheStale', () => {
  it('returns true when cached is null', () => {
    expect(isCacheStale(null, 0)).toBe(true);
  });

  it('returns false when seqMax matches', () => {
    expect(isCacheStale(makeCachedRecord(5), 5)).toBe(false);
  });

  it('returns true when event log has advanced', () => {
    expect(isCacheStale(makeCachedRecord(5), 6)).toBe(true);
  });

  it('returns false when cached seqMax is ahead (should not happen, but is non-stale)', () => {
    expect(isCacheStale(makeCachedRecord(10), 8)).toBe(false);
  });
});

describe('sessionCacheKey', () => {
  it('produces a stable string key', () => {
    expect(sessionCacheKey(SESSION_ID)).toBe(SESSION_ID);
  });
});

describe('statsToRecord / statsFromRecord round-trip', () => {
  it('round-trips X01SessionStats through DerivedStats', () => {
    const record = statsToRecord(SESSION_ID, 8, SAMPLE_STATS);
    expect(record.scope).toBe('session');
    expect(record.sourceEventSeqMax).toBe(8);
    expect(record.average).toBeCloseTo(SAMPLE_STATS.threeDartAvg, 5);

    const recovered = statsFromRecord(record);
    expect(recovered).not.toBeNull();
    expect(recovered!.dartsThrown).toBe(SAMPLE_STATS.dartsThrown);
    expect(recovered!.count180).toBe(SAMPLE_STATS.count180);
    expect(recovered!.busts).toBe(SAMPLE_STATS.busts);
    expect(recovered!.shortestLeg).toBe(SAMPLE_STATS.shortestLeg);
  });

  it('returns null from statsFromRecord when data field is absent', () => {
    const record: DerivedStats = {
      schemaVersion: 1,
      scope: 'session',
      key: SESSION_ID,
      sourceEventSeqMax: 0
    };
    expect(statsFromRecord(record)).toBeNull();
  });
});
