import type { DerivedStats } from '@/domain/types';
import type { X01SessionStats } from './types';

export function sessionCacheKey(sessionId: string): string {
  return sessionId;
}

export function isCacheStale(cached: DerivedStats | null, currentSeqMax: number): boolean {
  if (!cached) return true;
  return cached.sourceEventSeqMax < currentSeqMax;
}

export function statsToRecord(
  sessionId: string,
  seqMax: number,
  stats: X01SessionStats
): DerivedStats {
  return {
    schemaVersion: 1,
    scope: 'session',
    key: sessionCacheKey(sessionId),
    sourceEventSeqMax: seqMax,
    average: stats.threeDartAvg,
    checkoutPct: stats.checkoutPct ?? undefined,
    count180: stats.count180,
    firstNineAvg: stats.firstNineAvg ?? undefined,
    computedAt: new Date().toISOString(),
    data: stats as unknown as Record<string, unknown>
  };
}

export function statsFromRecord(record: DerivedStats): X01SessionStats | null {
  const d = record.data;
  if (!d || typeof d !== 'object' || !('dartsThrown' in d)) return null;
  return d as unknown as X01SessionStats;
}
