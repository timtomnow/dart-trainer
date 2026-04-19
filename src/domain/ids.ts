import { monotonicFactory, ulid } from 'ulid';

export type IdDeps = {
  now?: () => number;
  rng?: () => number;
};

export function createIdGenerator(deps: IdDeps = {}): () => string {
  if (deps.rng) {
    const generate = monotonicFactory(deps.rng);
    return () => generate(deps.now ? deps.now() : undefined);
  }
  return () => ulid(deps.now ? deps.now() : undefined);
}

export const newId = createIdGenerator();

export const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function isUlid(value: unknown): value is string {
  return typeof value === 'string' && ULID_REGEX.test(value);
}
