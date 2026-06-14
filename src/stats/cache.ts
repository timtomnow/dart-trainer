import type { X01SessionStats } from './types';
import type { DerivedStats } from '@/domain/types';

export function sessionCacheKey(sessionId: string): string {
  return sessionId;
}

export function isCacheStale(cached: DerivedStats | null, currentSeqMax: number): boolean {
  if (!cached) return true;
  return cached.sourceEventSeqMax < currentSeqMax;
}

/**
 * Game-agnostic per-session cache. The full stats object is stored under
 * `data`; the typed summary columns are X01-only and left empty here. Keyed by
 * sessionId, so games never collide (a session belongs to exactly one game).
 */
export function genericStatsToRecord(
  sessionId: string,
  seqMax: number,
  stats: object
): DerivedStats {
  return {
    schemaVersion: 1,
    scope: 'session',
    key: sessionCacheKey(sessionId),
    sourceEventSeqMax: seqMax,
    computedAt: new Date().toISOString(),
    data: stats as unknown as Record<string, unknown>
  };
}

export function genericStatsFromRecord<T>(record: DerivedStats): T | null {
  const d = record.data;
  if (!d || typeof d !== 'object') return null;
  return d as unknown as T;
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
