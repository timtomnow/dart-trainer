# TTN Darts Trainer — agent guide

**Shipping name:** TTN Darts Trainer. **Repo:** `dart-trainer`.

This is a local-first darts training PWA. The full plan is in [APP-PLAN.md](APP-PLAN.md). Read it before making structural changes. This file is the short version of the rules that matter while coding.

## Product principles (do not violate)
- **No accounts, no cloud database, no telemetry.** Data lives on the device.
- **Manual export/import is the only recovery path.** There is no sync.
- **Offline-first.** Core features must work with no network.
- **No backup nagging.** The app does not prompt for backups on launch, on session end, or on a schedule. Users own that decision. See §5 of the plan.
- **Desktop ≈ mobile.** Same product, responsive layout. No desktop-only admin screens.

## Architecture boundaries (hard rules)

The layers, top to bottom:

```
ui  →  screens  →  hooks (view models)  →  games/engine + storage + stats
```

- `src/games/**` must not import from `src/ui/**`, `src/screens/**`, or `src/storage/**`.
- `src/ui/**` must not import from `src/storage/**` or `src/games/**` (type-only imports from `src/domain/**` are fine).
- `src/screens/**` must not import from `src/storage/**` directly — go through `src/hooks/**`.
- `src/storage/**` must not import from `src/games/**`.

These boundaries are enforced by ESLint `no-restricted-paths`. If you need to cross one, lift the shared piece into `src/domain/` or `src/lib/` — do not punch a hole.

## Game engines are pure
- No `Date.now()`, `Math.random()`, `fetch`, `indexedDB`, or React imports inside `src/games/**`.
- If an engine needs time or randomness, take them as injected functions: `now: () => string`, `rng: () => number`.
- Engines return `{ state, events, error? }`. They never mutate inputs.
- One game = one folder under `src/games/<id>/` implementing `GameEngine`. Do not build a meta-framework for games.

## Events are the source of truth
- The append-only `GameEvent` log per session is authoritative.
- `Leg`, `Turn`, `Throw` records are derived caches. Never update them directly — regenerate them by replaying events.
- **Undo** = pop the last *input event* (`throw`, `forfeit`, `note`). Derived events (`turn_end`, `leg_end`, `session_end`) are re-synthesized by replay. Undo may cross turn and leg boundaries, all the way back to the first event.
- **Forfeit** is a first-class input event. It emits a `forfeit` event; replay sets session status to `forfeited`. Undoing a forfeit returns the session to `in_progress`.
- **Corrections** (v1+) are append-only: a `correction` event references the original event id. Never rewrite history.

## Stats are derived, not incremented
- `src/stats/` owns every stat. Screens consume `StatsSummary` objects; they do not compute stats inline.
- Stats are recomputed from events, not accumulated across writes.
- Caching lives in `derivedStats` keyed by `sourceEventSeqMax`. Recompute when the event log has advanced past that seq.

## Backup format is versioned from day one
- Every persisted record and the `BackupManifest` carry `schemaVersion`.
- A schema change requires all three:
  1. A migration in `src/storage/dexie/migrations/` (for the live DB).
  2. A migration in `src/backup/migrations/` (for backup files).
  3. A new fixture under `tests/fixtures/backups/v{N}.json` and a round-trip import test.
- **Import is Replace-only** with an explicit confirmation warning. Merge is not supported.

## Storage rules
- All user content goes through `StorageAdapter` (Dexie implementation under the hood).
- `localStorage` is for tiny UI prefs only (theme, haptics toggle). Never user or session content.
- Request `navigator.storage.persist()` once on first successful launch. Do not re-prompt.
- Handle `QuotaExceededError` gracefully. One dismissible inline hint at >85% quota. Never block play.

## File discipline
- Soft cap ~250 lines per file; hard review at 400. Split before it gets worse.
- If `ActiveGame` or any screen starts accumulating rule logic, stop and push it into the game engine.
- Do not create `utils.ts` grab bags. Name files by what they own.
- Do not leave `// TODO` comments without a tracking note in APP-PLAN.md or a milestone.

## Tests that matter
- Every game engine: `init`, `reduce` for every legal action, a property test that `replay(events)` equals live `reduce` accumulation.
- Every schema change: a fixture import test for each prior version.
- Every stat: deterministic fixture test against hand-computed values.
- AI opponents (M11+): seeded RNG produces deterministic output.

## What not to do
- Do not add centralized sync, accounts, email, or analytics. Explicitly out of scope.
- Do not prompt the user to export backups. They decide when.
- Do not compute stats inside screens or components.
- Do not mutate `Throw` / `Turn` / `Leg` cache rows — regenerate them from events.
- Do not add comments explaining *what* code does. Explain *why* only when non-obvious.
- Do not use emojis in shipped code, UI copy, or commit messages unless explicitly requested.
- Do not build a meta-framework for games. Games are plain folders implementing the `GameEngine` interface.
- Do not couple AI opponents to the profile store. AI seats live in `Session.participants[]` with `kind: "ai"`.

## Stack reference
- Build: Vite. Language: TypeScript (strict).
- UI: React 18 + Tailwind + small custom primitives.
- Routing: React Router (data router).
- Validation / types: Zod schemas in `src/domain/`; TS types derived from them.
- Storage: Dexie over IndexedDB, wrapped by `StorageAdapter`.
- IDs: ULID.
- Tests: Vitest + Testing Library + `fake-indexeddb` + Playwright.
- PWA: `vite-plugin-pwa` (Workbox).

## Before submitting a change
- Does it respect the layer boundaries above?
- If it touches persisted state, is there a migration + fixture?
- If it touches stats, is the computation in `src/stats/` and tested?
- If it touches a game, does `replay(events)` still equal live reduction under property tests?
- Are files under the size budget?
