import { describe, expect, it } from 'vitest';
import { resolveFilter, type StatsFilter } from '@/stats/filter';

const NOW = new Date('2026-06-13T12:00:00.000Z');

describe('resolveFilter', () => {
  it('all time resolves to no bounds', () => {
    expect(resolveFilter({ kind: 'all' }, NOW)).toEqual({});
  });

  it('past30 preset sets a since 30 days back', () => {
    const { since, until, limit } = resolveFilter({ kind: 'preset', preset: 'past30' }, NOW);
    expect(since).toBe('2026-05-14T12:00:00.000Z');
    expect(until).toBeUndefined();
    expect(limit).toBeUndefined();
  });

  it('pastYear preset sets a since 365 days back', () => {
    const { since } = resolveFilter({ kind: 'preset', preset: 'pastYear' }, NOW);
    expect(since).toBe('2025-06-13T12:00:00.000Z');
  });

  it('range expands date-only bounds to inclusive day edges', () => {
    const filter: StatsFilter = { kind: 'range', since: '2026-01-01', until: '2026-03-31' };
    expect(resolveFilter(filter, NOW)).toEqual({
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-03-31T23:59:59.999Z'
    });
  });

  it('range with only one bound omits the other', () => {
    expect(resolveFilter({ kind: 'range', since: '2026-01-01' }, NOW)).toEqual({
      since: '2026-01-01T00:00:00.000Z'
    });
    expect(resolveFilter({ kind: 'range', until: '2026-01-01' }, NOW)).toEqual({
      until: '2026-01-01T23:59:59.999Z'
    });
  });

  it('lastN resolves to a limit and no date bounds', () => {
    expect(resolveFilter({ kind: 'lastN', n: 25 }, NOW)).toEqual({ limit: 25 });
  });
});
