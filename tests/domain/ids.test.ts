import { describe, expect, it } from 'vitest';
import { createIdGenerator, isUlid, newId } from '@/domain/ids';

describe('ids', () => {
  it('generates a valid ULID with default deps', () => {
    const id = newId();
    expect(isUlid(id)).toBe(true);
    expect(id).toHaveLength(26);
  });

  it('produces monotonically increasing ULIDs when now and rng are fixed', () => {
    const gen = createIdGenerator({ now: () => 1717000000000, rng: () => 0.5 });
    const a = gen();
    const b = gen();
    const c = gen();
    expect(isUlid(a)).toBe(true);
    expect(isUlid(b)).toBe(true);
    expect(isUlid(c)).toBe(true);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  it('reproduces the same ULID sequence for the same fixed deps', () => {
    const deps = { now: () => 1717000000000, rng: () => 0.25 };
    const genA = createIdGenerator(deps);
    const genB = createIdGenerator(deps);
    expect(genA()).toBe(genB());
    expect(genA()).toBe(genB());
  });

  it('rejects non-ULID strings', () => {
    expect(isUlid('not-a-ulid')).toBe(false);
    expect(isUlid('01JARVQZAAAAAAAAAAAAAAAAA')).toBe(false);
    expect(isUlid(42 as unknown as string)).toBe(false);
  });
});
