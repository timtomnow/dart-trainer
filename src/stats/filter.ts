export type LastNCount = 5 | 10 | 25 | 50 | 100;

export const LAST_N_COUNTS: readonly LastNCount[] = [5, 10, 25, 50, 100];

export type StatsPreset = 'past30' | 'pastYear';

export type StatsFilter =
  | { kind: 'all' }
  | { kind: 'preset'; preset: StatsPreset }
  | { kind: 'range'; since?: string; until?: string }
  | { kind: 'lastN'; n: LastNCount };

export const DEFAULT_FILTER: StatsFilter = { kind: 'all' };

export type ResolvedFilter = {
  since?: string;
  until?: string;
  limit?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoIso(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

function startOfDayIso(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

function endOfDayIso(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`;
}

/**
 * Collapses a user-facing filter into the bounds the storage/selection layer
 * understands: an inclusive `since`/`until` ISO window and/or a trailing
 * `limit` on the count of most-recent sessions. `now` is injected so presets
 * stay deterministic under test.
 */
export function resolveFilter(filter: StatsFilter, now: Date = new Date()): ResolvedFilter {
  switch (filter.kind) {
    case 'all':
      return {};
    case 'preset':
      return { since: daysAgoIso(now, filter.preset === 'past30' ? 30 : 365) };
    case 'range': {
      const resolved: ResolvedFilter = {};
      if (filter.since) resolved.since = startOfDayIso(filter.since);
      if (filter.until) resolved.until = endOfDayIso(filter.until);
      return resolved;
    }
    case 'lastN':
      return { limit: filter.n };
  }
}

export function isStatsFilter(value: unknown): value is StatsFilter {
  if (!value || typeof value !== 'object') return false;
  const v = value as { kind?: unknown };
  switch (v.kind) {
    case 'all':
      return true;
    case 'preset':
      return (v as { preset?: unknown }).preset === 'past30' || (v as { preset?: unknown }).preset === 'pastYear';
    case 'range':
      return true;
    case 'lastN':
      return LAST_N_COUNTS.includes((v as { n?: number }).n as LastNCount);
    default:
      return false;
  }
}

export function describeFilter(filter: StatsFilter): string {
  switch (filter.kind) {
    case 'all':
      return 'All time';
    case 'preset':
      return filter.preset === 'past30' ? 'Past 30 days' : 'Past year';
    case 'range': {
      if (filter.since && filter.until) return `${filter.since} to ${filter.until}`;
      if (filter.since) return `Since ${filter.since}`;
      if (filter.until) return `Until ${filter.until}`;
      return 'Custom range';
    }
    case 'lastN':
      return `Last ${filter.n} games`;
  }
}
