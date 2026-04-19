# TTN Darts Trainer — App Plan

> **Shipping name:** TTN Darts Trainer
> **Repo name:** `dart-trainer`
>
> Status: planning only. No code is produced from this document. This is the architecture and build plan the user must approve before implementation starts.

---

## 1. Product framing

### What the app is
- **TTN Darts Trainer** — a modern, lightweight darts **training companion** for solo practice and casual turn-based multiplayer on a single device.
- **Mobile-first** (phone held in one hand while practicing); **desktop/tablet** for setup, review, and statistics.
- **Local-first / offline-first by default** — the app works with no network and no account.
- **No sign-in, no cloud store of user data.** Data lives on-device.
- **Manual, first-class export/import** (human-readable JSON file) is the only recovery path.
- Inspired in feature scope by apps like *My Dart Training*, but built from scratch and not visually copied.
- Supports multiple game modes with distinct rules (X01, Cricket, Round the World, checkout practice, free drills) through a shared engine.
- Keeps a durable **event history** of throws so undo, corrections, and stats all derive from the same source of truth.
- Designed as a **small modular monolith** so new game types can be added without rewriting the app.
- One product, two layouts — desktop is not a separate admin app.

### Design principles
1. **Device-owned data.** The user is always the custodian. No silent cloud copies.
2. **Explicit portability.** Backups are files the user can read, store, email to themselves, or put on a USB stick.
3. **Honesty over vibes.** No "Syncing…" UI if nothing is syncing. No fake progress.
4. **Fast on low-end phones.** Taps must feel instant; computation happens locally and cheaply.
5. **Separation of concerns.** Scoring logic never imports UI. UI never writes to storage directly.
6. **Additive schema.** Every persisted record carries a schema version; migrations are forward-only.
7. **One mental model.** Same data, same flows on phone and desktop, responsive layout.
8. **Derivable stats.** Stats are computed from event history, not hand-kept counters.
9. **Small, orthogonal modules.** Each game is a plugin implementing a known interface.
10. **Boring tech.** Prefer well-understood tools so maintenance cost stays low.

### Non-goals and explicit constraints
- ❌ No user accounts, email/password, OAuth, or anonymous server identities.
- ❌ No centralized cloud database of user-recoverable data.
- ❌ No analytics/telemetry that identifies users.
- ❌ No required network connectivity for any core feature.
- ❌ No background "sync." Import/export is manual.
- ❌ No `localStorage` for session or profile data (tiny UI prefs only).
- ❌ No attempt to mimic *My Dart Training*'s UI.
- ❌ No payment, subscription, or gated content in MVP.
- ❌ No leaderboards or social features in MVP or v1.

### Biggest architecture risks (flagged now, addressed later in plan)
| # | Risk | Where it bites | Mitigation preview |
|---|---|---|---|
| R1 | Game logic leaks into UI components | Adding a new game type requires touching screens | Enforce `GameEngine` interface; games live in `src/games/*` with no React imports |
| R2 | Stats drift from truth | Checkout %, averages, 180s don't match reality after undo/edits | Single source of truth = event log; stats derived, cached by session |
| R3 | IndexedDB corruption or eviction | User loses data silently | Request persistent storage on install (`navigator.storage.persist`); wrapped storage with health check; silent quota monitor; only surface a hint when there is a real problem |
| R4 | Backup file incompatibility across versions | User can't import old file on new install | Versioned manifest + forward-only migration registry from day one |
| R5 | Undo/correction semantics become ad-hoc per game | Inconsistent UX, subtle scoring bugs | Undo = pop last event; corrections = compensating events, not mutations |
| R6 | "Local-first" tempts a partial cloud sync later | Re-architecture pressure, leaks into core | Sync (if ever) must plug in behind the storage interface; not a core concern |
| R7 | Claude-generated code grows a giant `GameScreen.tsx` | Maintainability collapses | File-size budget, linter rule, and architectural checklist in `CONTRIBUTING.md` |
| R8 | PWA install UX is unfriendly on iOS | Users think app is broken | Explicit "Install" screen with iOS/Android instructions; fall back to browser use |

---

## 2. Feature map

### MVP (must-have for first usable release)
| Feature | Why MVP |
|---|---|
| Create/rename/delete local player profile(s) | Identity on-device; every session attaches to one profile |
| Select active profile | Prereq for any session |
| Play **X01** (501, 301, 701) with double-in/out, straight-out, masters-out options | The most-used darts game; validates the engine design |
| Manual score entry (three darts per turn, with single/double/triple/miss buttons) | Core input method on a phone |
| Throw-by-throw undo back to the first throw of the session | Non-negotiable — input errors happen constantly |
| **Forfeit** current session (explicit give-up, session recorded as `forfeited`) | Real practice sessions often end early; must be a first-class action, not a workaround |
| Session save on every event | Survives app close / crash |
| Resume in-progress session | Phone interruptions are the norm |
| Post-session summary with a rich stat panel (see §11 M3 for full list: 3-dart avg, first-9 avg, checkout %, 180s, 140+, 100+, 80+, 60+, highest score, highest checkout, shortest leg, busts, session duration, …) | Feedback loop is the point of training; thin stats feel useless |
| Basic history list (last N sessions) | Without history, stats are meaningless |
| Export full backup (JSON file, versioned) | Core principle |
| Import backup with validation | Only recovery path |
| Settings: theme (light/dark/system), haptics, default game preset | Tiny UI prefs; the only `localStorage` use |
| Offline-capable PWA shell + installable | Delivers the "app" feel without a store |

### v1 (right after MVP)
| Feature | Why here, not MVP |
|---|---|
| **Cricket** (standard scoring) | Second most common game; pressure-tests the engine interface |
| **Round the World** (hit 1→20, 25, bull) | Simple rules, good to prove drill-style games |
| **Checkout practice** (random or targeted finishes) | Natural extension of X01 |
| **Round the World scoring** (weighted scoring variant) | Pairs with RTW once base game is proven |
| Multiple profiles in one session (turn-based multiplayer) | Needs profile model settled first |
| **Computer opponent** with difficulty levels (easy / medium / hard / expert) | Shares turn-taking infrastructure with multi-profile; AI logic is its own isolated module |
| Per-profile stats dashboard (rolling averages, trend chart) | Requires enough historical data to be meaningful |
| Session notes / tags | Nice-to-have after basic history works |
| Export filtered subset (one profile, date range) | Power feature, not essential for recovery |
| CSV export alongside JSON | For users who want spreadsheets |

### Later / optional
| Feature | Why deferred |
|---|---|
| Generic user-defined practice drills (builder UI) | Needs real usage to understand the shape |
| Achievements / milestones | Only meaningful after long-term use |
| Audio cues (checkout suggestions, score callouts) | Polish; can regress accessibility if rushed |
| Checkout suggestion engine (shortest path) | Non-trivial algorithm; nice but not core |
| Tablet-specific two-player "pass-and-play" layout | Optimization of existing feature |
| Optional end-to-end encrypted sync (peer-to-peer or user-owned cloud) | Explicitly out of core; must plug in behind storage interface |
| Localization beyond English | Scope creep risk; do once vocabulary stabilizes |
| Theming beyond light/dark | Polish |
| Printable/shareable session card (image) | Polish |

---

## 3. User flows

### 3.1 First launch
1. App opens to a **Welcome** screen.
2. Single explanation card: "Your data stays on this device. Export backups to keep them safe."
3. Primary CTA: **Create your first profile** (name only; avatar optional).
4. After creation, app writes `appSettings` (schema version, firstLaunchAt, activeProfileId) and lands on **Home**.
5. In the background, the app silently requests persistent storage via `navigator.storage.persist()`. No banners, no backup nag.

### 3.2 Create player profile
1. From Home → Profiles → **New**.
2. Enter name (required, 1–32 chars). Optional: handedness, preferred game, default X01 start.
3. On save: generate `profileId` (ULID), set `createdAt`, persist, return to profiles list.
4. If it's the first profile, it becomes active automatically.

### 3.3 Choose or switch profiles
1. Profile chip in the top bar → opens bottom sheet (mobile) or dropdown (desktop).
2. Tap a profile → becomes active; the active profile is the default for new sessions.
3. Multi-profile sessions override this per-session (v1).

### 3.4 Start a practice session
1. Home → **Play**.
2. Choose a game mode (card grid: X01, Cricket, RTW, Checkout, Drill).
3. Game-specific setup (e.g., X01: start score, in/out rules, legs).
4. Confirm active profile(s).
5. **Start** → lands on Active Game screen. A `session` is created and persisted with status `in_progress`.

### 3.5 Play X01 (representative flow)
1. Active Game shows: current score, dart history for the turn, quick-entry keypad.
2. Each dart = one `throw` event appended to the session's event log.
3. After 3 darts (or bust / checkout), turn ends; `turn` event is closed.
4. Undo button reverses the last event (throw or turn-close).
5. Bust / checkout handled by the X01 rule module — UI only reflects state.
6. On leg win: animate, record `leg_won` event, start next leg or finish session.
7. On session finish: status → `completed`, user is routed to Summary.

### 3.6 Save and review session history
1. Every event write is persisted immediately (no explicit "save").
2. History tab lists sessions newest-first (game, date, key stat).
3. Tap a session → detail view with per-leg breakdown and event replay.
4. Delete session (with confirm) → marks as soft-deleted (tombstone), hidden from list, purged by an occasional vacuum task.

### 3.7 Export backup
1. Settings → **Export backup**.
2. App builds a `BackupManifest` containing schema version, export timestamp, app version, profiles, sessions, events, settings, and a content hash.
3. Triggers a file download (`dart-trainer-backup-YYYY-MM-DD.json`) on desktop, or share sheet on mobile.
4. Toast confirms with file size and item counts.

### 3.8 Import backup
1. Settings → **Import backup** → file picker.
2. App parses JSON, validates against schema for the file's declared version.
3. If version < current: run forward migrations to current schema in-memory, then validate again.
4. Show preview and an explicit warning: "This will **replace** all current data (N profiles, M sessions, K events). Existing data on this device will be lost. This cannot be undone." Confirm or cancel.
5. On confirm: inside a single transaction, wipe local data and write imported data. Merge is deliberately not supported in MVP — Replace with warning is the only mode.
6. On success: summary screen with counts; on failure: human-readable error with line/offset pointer where possible, and local data is untouched.

### 3.9 Reinstall / new device reality
1. Fresh install = fresh state. No magic.
2. Welcome screen includes a **"Restore from backup"** button alongside "Create profile."
3. If the user has a backup file, they import and resume.
4. If they don't, the app explains plainly: "There is no cloud copy. Without a backup file, previous data cannot be recovered. Create a profile to start fresh."
5. No deceptive "checking for account" spinner.

---

## 4. Domain model

All IDs are **ULIDs** (sortable, generated on-device, collision-safe for merge).
All timestamps are **ISO 8601 UTC strings** (`createdAt`, `updatedAt`).
Every persisted record carries `schemaVersion: number`.

| Entity | Purpose | Key fields (required ⚑ / optional) | ID | Source of truth? |
|---|---|---|---|---|
| `AppSettings` | Device-level prefs and app state | ⚑`schemaVersion`, ⚑`appVersion`, ⚑`activeProfileId\|null`, ⚑`theme`, `haptics`, `defaultGamePresetId`, ⚑`firstLaunchAt`, `lastBackupAt` | singleton (`"app"`) | Truth |
| `PlayerProfile` | A human the app tracks | ⚑`id`, ⚑`name`, `handedness`, `avatarColor`, ⚑`createdAt`, ⚑`updatedAt`, `archived` | ULID | Truth |
| `ProfilePreferences` | Per-profile defaults | ⚑`profileId`, `defaultX01Start`, `defaultInRule`, `defaultOutRule`, `defaultLegsToWin` | = `profileId` | Truth |
| `GameModeDefinition` | Static registry of available games | ⚑`id` (e.g., `"x01"`), ⚑`version`, ⚑`displayName`, ⚑`engineKey`, `configSchema` | string key | Code-derived (bundled) |
| `PracticeDrillDefinition` | User-defined or built-in drill | ⚑`id`, ⚑`name`, ⚑`rules` (JSON), ⚑`createdAt`, ⚑`builtin:boolean` | ULID / slug for builtins | Truth (user ones); Code-derived (builtins) |
| `Session` | One play session | ⚑`id`, ⚑`gameModeId`, ⚑`gameConfig`, ⚑`participants[]` (MVP: list of profileIds; v1+: may also include AI seats — see `Participant`), ⚑`status` (`in_progress\|completed\|forfeited\|abandoned\|deleted`), ⚑`startedAt`, `endedAt`, `notes`, `tags[]`, ⚑`createdAt`, ⚑`updatedAt` | ULID | Truth |
| `Participant` (v1+) | A seat in a session — a human profile or an AI opponent | ⚑`sessionId`, ⚑`index` (turn order), ⚑`kind` (`profile\|ai`), `profileId?`, `aiConfig?` (`{ level, seed, personality? }`), `displayName?` | composite (`sessionId + index`) | Truth |
| `Leg` | Within-session segmentation | ⚑`id`, ⚑`sessionId`, ⚑`index`, ⚑`startedAt`, `endedAt`, `winnerProfileId` | ULID | Derived from events (optionally cached) |
| `Turn` | One player's visit | ⚑`id`, ⚑`legId`, ⚑`profileId`, ⚑`index`, ⚑`startedAt`, `endedAt`, `totalScored`, `bust` | ULID | Derived from events |
| `Throw` | A single dart | ⚑`id`, ⚑`turnId`, ⚑`index` (0–2), ⚑`segment` (`S\|D\|T\|SB\|DB\|MISS`), ⚑`value` (0–60), ⚑`timestamp` | ULID | **Truth, as an event** |
| `GameEvent` | Append-only log entry | ⚑`id`, ⚑`sessionId`, ⚑`type` (`throw\|turn_end\|leg_end\|correction\|undo\|note`), ⚑`payload`, ⚑`timestamp`, ⚑`seq` | ULID | **Primary truth** |
| `DerivedStats` | Pre-computed summary per session / profile | ⚑`scope` (`session\|profile\|global`), ⚑`key`, `average`, `checkoutPct`, `count180`, `doublesHitPct`, `firstNineAvg`, `computedAt`, ⚑`sourceEventSeqMax` | composite | **Derived / cache** |
| `BackupManifest` | Root of an export file | ⚑`schemaVersion`, ⚑`appVersion`, ⚑`exportedAt`, ⚑`deviceLabel`, ⚑`contentHash`, ⚑`counts`, ⚑`data` (profiles, sessions, events, settings) | n/a (file) | Transport format |

**Relationships (summary)**
```
AppSettings (1) ── activeProfileId ─▶ PlayerProfile (0..1)
PlayerProfile (1) ── 1 ── ProfilePreferences
PlayerProfile (1) ── N ── Session (via Session.profileIds[])
Session (1) ── N ── GameEvent (append-only)
Session (1) ── N ── Leg (derived)
Leg (1)     ── N ── Turn (derived)
Turn (1)    ── N ── Throw (derived; underlying truth is GameEvent.payload)
Session (1) ── 0..1 ── DerivedStats(scope=session)
PlayerProfile (1) ── 0..1 ── DerivedStats(scope=profile)
```

**Key modeling decision: events are the truth.** `Leg`/`Turn`/`Throw` can be persisted as derived caches for query speed, but must always be reproducible from the `GameEvent` log of a session. Undo = appending a compensating event (or, at MVP simplicity, popping the last event before it leaves the in-memory session). Corrections (e.g., "that third dart was actually a T20, not T1") are modeled as `correction` events referencing the corrected event's id.

---

## 5. Data persistence strategy

### Evaluation
| Option | Fit for this app | Notes |
|---|---|---|
| `localStorage` | ❌ for core data | Sync API, ~5MB cap, string-only. Fine for `theme`, `haptics` toggle. |
| `IndexedDB` (via **Dexie**) | ✅ **recommended for MVP** | Structured, indexed, transactional, ~large quota, works offline in any browser/PWA, works in Capacitor webview. |
| SQLite via Capacitor/Expo plugin | ✅ upgrade path | Richer queries, but adds a native layer the MVP doesn't need. |
| File-based export/import (JSON) | ✅ required (not primary storage) | Transport and backup format only; not the live store. |
| Remote DB (Firebase/Supabase/etc.) | ❌ | Violates "no centralized cloud database" principle. |

### Recommended MVP architecture
- **Primary store:** IndexedDB through **Dexie** with a single database `dart_trainer` and versioned schema.
- **Object stores:** `appSettings` (singleton), `profiles`, `profilePrefs`, `sessions`, `events` (indexed by `sessionId, seq`), `derivedStats`, `drills`.
- **Tiny UI prefs:** `localStorage` key `dt.ui` only (theme, haptics, last-viewed tab). Never user content.
- **Storage layer interface** (`StorageAdapter`) abstracts Dexie; any future native SQLite swap happens behind this interface only.
- **Backups:** JSON file, UTF-8, pretty-printed, with top-level `BackupManifest`.

### Upgrade path (if/when needed)
- **Signal to switch:** sustained >50MB per active user, or requirement for cross-session analytical SQL.
- **Path:** replace `StorageAdapter` impl with a Capacitor SQLite (or Expo SQLite if we ever port to React Native) impl. Data migrates via export → import using the same `BackupManifest` format. No change to game engines or UI.

### Answers to the explicit questions
| Question | Answer |
|---|---|
| Where does **profile** data live? | IndexedDB `profiles` + `profilePrefs` stores, plus `activeProfileId` pointer in `appSettings`. |
| How are **sessions** stored? | A `sessions` row per session (metadata) plus an append-only `events` stream keyed by `(sessionId, seq)`. Derived `Leg`/`Turn`/`Throw` may be cached but can always be rebuilt from events. |
| How are **stats** recalculated vs cached? | Recomputed from events on session end and on explicit refresh. Cached in `derivedStats` with `sourceEventSeqMax`. If `session.events.lastSeq > sourceEventSeqMax`, cache is invalidated. |
| **Backup/export format** | One JSON file with `BackupManifest` root, full contents of all stores, SHA-256 `contentHash` over canonicalized data. |
| **Import validation strategy** | (1) File is valid JSON. (2) Manifest shape matches expected schema. (3) `schemaVersion` is known; migrate forward if needed. (4) `contentHash` matches. (5) Per-entity schema validation (Zod). (6) Referential integrity check (every `session.profileIds` resolves, every event's `sessionId` resolves). Only after all pass does a Merge/Replace run inside a single IndexedDB transaction. |
| **Schema versioning & migrations** | Each record carries `schemaVersion`. A `migrations/` registry maps `v(n) → v(n+1)` pure functions. Forward-only. On app boot, a startup check migrates any `schemaVersion < current`. The same registry is used during import. |
| **Durability in practice** | On first successful app launch, call `navigator.storage.persist()` once to request persistent storage. Installed PWAs (Chrome/Edge) typically get this grant silently; Firefox prompts; Safari installs grant it implicitly. When granted, the browser **will not evict** data under pressure — it stays until the user deletes the app or clears site data. Realistic expectations: on an installed mobile PWA, data lasts as long as the install (years); in a desktop browser without install, persistence is best-effort (generally days to indefinitely). Users are expected to back up rarely, not as part of routine play. |
| **Corruption / failure recovery** | Startup health check: open DB, read `appSettings`, count stores. If the DB fails to open → route to an explicit recovery screen ("Import a backup, or reset app data"). If a partial read → quarantine the bad record and show a one-time inline hint on the affected session. No global nagging banners. |
| **Storage full / partial write** | Silent quota monitor via `navigator.storage.estimate()` runs on session end only; if usage > 85% of quota, show a single, dismissible inline hint ("Storage is getting full — consider exporting a backup"). Never block play. On `QuotaExceededError` during a write: retry after purging soft-deleted tombstones; if still failing, keep the session playable in-memory and surface an actionable dialog with an export button. |
| **Backup UX philosophy** | Export is user-initiated, not prompted. No first-launch banner, no per-session reminder, no recurring nag. The app proactively mentions backup in exactly two cases: (a) a real storage problem (near-quota or DB open failure), (b) immediately before a destructive action the user has initiated (e.g., "Reset app data" in Settings). |

---

## 6. Game logic architecture

### Layer boundaries (hard rules)
```
┌─────────────────────────────────────────────┐
│  UI (React components, screens, animations) │  ← may read view models; never imports storage or engines directly
├─────────────────────────────────────────────┤
│  View models / hooks (useSession, useGame)  │  ← orchestrates engine + storage; no rule logic
├─────────────────────────────────────────────┤
│  Game engine (generic core + rule modules)  │  ← pure functions; no I/O, no React, no storage imports
├─────────────────────────────────────────────┤
│  Storage adapter (Dexie impl behind iface)  │  ← knows nothing about game rules
└─────────────────────────────────────────────┘
```

**Lint/convention rules (enforced later):**
- `src/games/**` must not import from `src/ui/**` or `src/storage/**`.
- `src/ui/**` must not import from `src/storage/**` directly (goes through hooks/view models).
- `src/storage/**` must not import from `src/games/**`.

### Generic engine concepts
A single engine module (`src/games/engine/`) provides:
- `GameState<TConfig, TState>` — opaque per-game state blob.
- `GameEngine<TConfig, TState, TAction>` interface:
  ```
  init(config: TConfig, profileIds: ULID[]): TState
  reduce(state: TState, action: TAction): { state: TState; events: GameEvent[] }
  isLegOver(state: TState): LegResult | null
  isSessionOver(state: TState): SessionResult | null
  view(state: TState): GameViewModel      // strictly for UI rendering
  replay(events: GameEvent[], config: TConfig): TState   // rebuild from log
  ```
- `Action` is the game's input vocabulary (e.g., `{ type: "throw", segment, value }`, `{ type: "undo" }`, `{ type: "correct", eventId, replacement }`).
- Engines are **pure**: no dates (timestamps passed in), no randomness (seed passed in), no I/O.

### Per-game rule modules
Each game is a folder under `src/games/<id>/` exporting a `GameEngine` implementation and a `GameModeDefinition`. Games never share mutable state; they share only the interface and small pure helpers from `src/games/engine/common/` (e.g., segment parsing, score arithmetic, bust detection helpers).

| Game | Rule module responsibility |
|---|---|
| **X01** (`games/x01/`) | Starting score, in-rule (`straight`/`double`), out-rule (`straight`/`double`/`masters`), per-turn subtraction, bust detection, checkout detection, legs-to-win tracking. |
| **Cricket** (`games/cricket/`) | Target segments (15–20, bull), mark counting (1–3), open/closed status per player, scoring when a number is open for you and not for opponents, win condition. |
| **Round the World** (`games/rtw/`) | Current target progression (1→20→25→bull), hit detection, next-target advancement. |
| **RTW Scoring variant** (`games/rtw-scoring/`) | RTW progression + weighted scoring (single/double/triple multiplier for the current target). |
| **Checkout practice** (`games/checkout/`) | Random or scripted finish (e.g., 170, 167, …), attempts per finish, success tracking. |
| **Generic drill** (`games/drill/`) | Configurable rounds, target(s), hit/miss counting, no opponent. |

### Event model (applies to every game)
All games append to a single `GameEvent` log per session:
```
{
  id, sessionId, seq, timestamp,
  type: "throw" | "turn_end" | "leg_end" | "session_end"
      | "correction" | "undo" | "note",
  payload: { ...game-specific fields... }
}
```
- **Throws** carry `{ segment, value, profileId, dartIndex }`.
- **Turn/leg/session ends** carry computed results (for fast replay without re-running rules).
- **Corrections** carry `{ targetEventId, newPayload }`.
- **Undo** carries `{ undoneEventId }`; at MVP, simpler: we just don't append — we drop the last event before it's committed. An "undo after commit" becomes a `correction` targeting the bad event.
- `seq` is a monotonically increasing integer per session.

### Undo, corrections, forfeit, invalid input
- **Undo (general rule):** Undo pops the most recent *input event* from the session's event log. Input events are: `throw`, `forfeit`, `note`. Derived events (`turn_end`, `leg_end`, `session_end`) are re-synthesized by replay and are never reversed directly by the user.
- **Linear, repeatable undo:** the user can press Undo repeatedly to walk all the way back to the first throw of the session — each press removes one input event. Crossing turn and leg boundaries is allowed (undoing the first throw of turn N+1 lands you back at the final state of turn N). No redo stack in MVP.
- **Correction of an earlier throw (v1+):** append a `correction` event referencing the original event's id with the corrected segment/value. Replay applies the correction. MVP can omit this; undo-to-point + re-enter is acceptable.
- **Forfeit:** a user action that emits a single `forfeit` input event; replay transitions the session to `forfeited`. Stats still compute for forfeited sessions but are clearly labeled. Pressing Undo after forfeiting returns the session to `in_progress`.
- **Invalid input:** engine returns `{ state, events: [], error }` — UI shows a toast; state is never mutated by invalid actions.

### Partial session resume
- `sessions.status === "in_progress"` + the event log is sufficient.
- On app launch, if an in-progress session exists, Home shows **Resume**. Opening it calls `engine.replay(events, config)` to rebuild state.
- A session auto-transitions to `abandoned` if no events have been appended for N days (configurable; MVP: never auto-abandon, user chooses).

### Computer opponent (v1+)
- Lives in `src/games/ai/`, isolated from rule modules.
- Exposes a single pure function: `aiThrow(state, aiConfig, rng) => { segment, value }`. No I/O, no React, no storage.
- `aiConfig` fields: `level` (`easy | medium | hard | expert`), `seed` (for deterministic tests), optional `personality` hooks later (aggressive vs. safe finishers).
- Difficulty is modeled as a 2D Gaussian dispersion around the AI's intended target (tighter σ at higher levels) combined with level-appropriate target selection (e.g., `easy` aims at T1/T20 with large spread; `expert` uses an optimal checkout table for X01).
- Turn orchestration lives in the active-game hook, not the AI module: the hook calls `aiThrow` three times per AI turn and dispatches `throw` actions indistinguishable from human input.
- Stats attribution: AI games credit the human profile only. The AI opponent is stored as a `participants[]` entry with `kind: "ai"` — there is no phantom AI entry in the profiles store.

### Stats generation
- A `stats/` module owns all stat calculations. It takes an array of `GameEvent` + `GameModeDefinition` and returns a `StatsSummary`.
- Stats computed consistently across games where they make sense (e.g., "throws per session" applies to all; "X01 average" only to X01). Each game module declares which stats are applicable.
- Stats are **recomputed, not incremented**, to avoid drift. Caching is purely a performance layer keyed on `sourceEventSeqMax`.

---

## 7. Mobile-first UX structure

### Information architecture
Bottom tab bar (mobile) / left rail (desktop):
1. **Home** — resume in-progress session if any, otherwise big "Play" CTA and quick-start row.
2. **Play** — game picker.
3. **History** — session list.
4. **Stats** — per-profile summary and trend.
5. **Settings** — profiles, import/export, appearance, about.

Desktop layout uses the same five sections in a left rail; Home becomes a two-column dashboard (resume card + recent sessions + quick stats).

### Screens and their responsibilities
| Screen | Owns | Must reach in ≤ taps |
|---|---|---|
| **Home** | Active profile chip, resume card, primary "Play" CTA, last-session glance | Resume: 1 tap. Play: 1 tap. |
| **Profile switcher (sheet)** | List of profiles, quick-create | 2 taps from anywhere |
| **Play / game picker** | Game mode grid + recent presets | 2 taps to start a saved preset |
| **Game setup** | Per-game config form | — |
| **Active Game** | Score display, keypad, turn history, undo, quit | Undo: 1 tap. Correction: 2 taps. |
| **Post-session summary** | Final stats, notes, "Play again" / "Home" | Play again: 1 tap |
| **History list** | Filterable, sortable list | Open session: 1 tap |
| **Session detail** | Meta + per-leg breakdown + raw event replay | Export this session: 2 taps |
| **Stats** | KPI cards + trend chart + filters (profile/game/date) | Switch profile: 2 taps |
| **Settings** | Profiles, Appearance, Data (import/export), About | Export backup: 2 taps |
| **Import flow** | File picker → preview → merge/replace → result | — |

### State transitions (core ones)
- `AppBoot → NeedsFirstProfile → Home` (fresh install) or `AppBoot → Home` (returning).
- `Home → (resume) ActiveGame` ↔ `ActiveGame → (finish) PostSessionSummary → History`.
- `Home → Play → GameSetup → ActiveGame`.
- `ActiveGame → (quit) ConfirmQuit → Home` (session marked `abandoned` unless already done).

### Interaction rules for mobile play
- Keypad thumb-reachable at bottom. Primary targets ≥ 48px.
- Score preview updates live; a throw isn't committed until you tap the segment type (S/D/T/MISS) — this halves misclicks compared to "commit on tap anywhere."
- Haptic tick on every throw (respects setting).
- Undo always visible; corrections behind a small "edit" affordance on the turn history list.
- Landscape supported on phones for wider keypad; portrait is the default assumption.

---

## 8. File tree and module ownership

```
dart-trainer/
├─ APP-PLAN.md                # this document
├─ README.md
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ index.html
├─ public/
│  ├─ manifest.webmanifest    # PWA manifest
│  └─ icons/                  # PWA icons
├─ src/
│  ├─ main.tsx                # app shell bootstrap ONLY
│  ├─ app/                    # app shell: routing, providers, error boundary
│  │  ├─ App.tsx
│  │  ├─ routes.ts
│  │  └─ providers/           # storage, theme, settings providers
│  ├─ ui/                     # reusable UI components (no domain logic)
│  │  ├─ primitives/          # buttons, sheets, tabs
│  │  ├─ score/               # keypad, score display, turn list
│  │  └─ charts/
│  ├─ screens/                # route targets; compose ui + hooks
│  │  ├─ home/
│  │  ├─ play/
│  │  ├─ game/                # ActiveGame screen (game-agnostic shell)
│  │  ├─ summary/
│  │  ├─ history/
│  │  ├─ stats/
│  │  └─ settings/
│  ├─ domain/                 # entity types + zod schemas + pure helpers
│  │  ├─ ids.ts               # ULID helpers
│  │  ├─ schemas.ts           # zod schemas for all entities
│  │  ├─ types.ts             # TypeScript types derived from schemas
│  │  └─ events.ts            # GameEvent type and guards
│  ├─ games/                  # all game logic — pure, no UI
│  │  ├─ engine/              # GameEngine interface + shared helpers
│  │  │  ├─ index.ts
│  │  │  └─ common/           # segment parsing, score math, bust helpers
│  │  ├─ registry.ts          # maps gameModeId → engine + GameModeDefinition
│  │  ├─ x01/
│  │  ├─ cricket/
│  │  ├─ rtw/
│  │  ├─ rtw-scoring/
│  │  ├─ checkout/
│  │  └─ drill/
│  ├─ storage/                # persistence layer
│  │  ├─ adapter.ts           # StorageAdapter interface
│  │  ├─ dexie/               # Dexie implementation
│  │  │  ├─ db.ts
│  │  │  ├─ repos/            # one per object store
│  │  │  └─ migrations/       # dexie version migrations
│  │  └─ uiPrefs.ts           # tiny localStorage wrapper
│  ├─ backup/                 # import/export
│  │  ├─ manifest.ts          # BackupManifest type + builder
│  │  ├─ export.ts
│  │  ├─ import.ts            # parse → validate → migrate → apply
│  │  └─ migrations/          # schema migrations for backup files
│  ├─ stats/                  # derived stats
│  │  ├─ compute.ts
│  │  ├─ cache.ts
│  │  └─ formatters.ts
│  ├─ hooks/                  # view models; bridge engines + storage + UI
│  │  ├─ useActiveSession.ts
│  │  ├─ useProfile.ts
│  │  └─ useStats.ts
│  ├─ lib/                    # generic utilities (no domain knowledge)
│  └─ styles/                 # tokens, global CSS
├─ tests/
│  ├─ games/                  # unit tests per game engine
│  ├─ storage/                # storage + migration tests
│  ├─ backup/                 # import/export roundtrip tests
│  ├─ stats/                  # stats computation tests
│  └─ e2e/                    # playwright smoke flows
└─ .github/
   └─ workflows/ci.yml        # lint + typecheck + tests + build
```

### Ownership rules (what each folder owns and must *not* own)
| Folder | Owns | Must NOT own |
|---|---|---|
| `app/` | Routing, providers, error boundary | Game rules, DB access, screen layouts |
| `ui/` | Reusable presentational components | Any domain logic, any storage calls, any game-specific code |
| `screens/` | Screen composition, layout, per-screen state | Game rules, direct DB calls (must use hooks) |
| `domain/` | Entity types, zod schemas, pure helpers on those types | Storage, UI, game rules |
| `games/` | Rule logic, engine interface, pure reducers | React imports, storage imports, `Date.now()`, `Math.random()` without injection |
| `storage/` | Dexie setup, repositories, schema versions | Game rules, UI imports |
| `backup/` | Manifest format, import/export, backup migrations | UI (beyond file picker hook), game rules |
| `stats/` | Computations over `GameEvent` streams | Storage (receives data), UI |
| `hooks/` | Binding engines↔storage↔components, orchestration | Rule logic itself, storage internals |
| `lib/` | Generic utilities (formatters, ULID wrapper) | Anything domain-specific |
| `tests/` | Test code | Shipping code |

---

## 9. Technical decisions

### Stack comparison
| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **PWA with React + Vite + TypeScript** | Free hosting on GitHub Pages; installable on iOS/Android; single codebase; tiny build; offline via service worker; full DOM API (IndexedDB, File System Access where available); easiest path to Play Store via Bubblewrap/TWA. | iOS PWA install UX is rougher; no native app store badge without wrapping. | ✅ **Recommended for MVP** |
| Next.js | Great DX, routing, server components | Needs a server for best features; most of its value is server-side. Overkill for an offline app hosted on GitHub Pages (would run as SSG anyway). | Overkill |
| Expo React Native | True native, native UI feel, decent offline story | Requires React Native knowledge; distribution needs app stores (Play Store requires a Google developer account fee — user asked for free); overkill for a local-first score entry app. | Defer |
| Capacitor (wrap the PWA) | Same codebase as PWA; can produce an `.apk`/`.aab` sideloadable file as a link from GitHub Pages; enables native SQLite later | Adds Android tooling; some PWA APIs behave differently in webview. | ✅ **Upgrade path**, not MVP |

### Recommendation for MVP
**PWA built with Vite + React + TypeScript**, styled with Tailwind (or CSS Modules if we want zero framework), persistence via **Dexie** over IndexedDB, validation via **Zod**, routing via **React Router**, testing via **Vitest + Playwright**, installable via standard web manifest.

**Distribution:**
- Host the built app on **GitHub Pages** from `main` (free, HTTPS, installable as a PWA).
- For Android sideload/Play Store later, wrap with **Capacitor** (or Bubblewrap TWA) to produce an installable package that can be linked from the GitHub Pages site. This is optional and does not affect MVP.

### Key library choices (MVP)
| Concern | Choice | Why |
|---|---|---|
| Build | Vite | Fast, simple, PWA plugin mature. |
| Language | TypeScript (strict) | Type safety is the cheapest bug insurance for domain-heavy code. |
| UI framework | React 18 | Familiar; excellent PWA support. |
| Routing | React Router (data router) | Standard, file-size reasonable. |
| Styling | Tailwind CSS | Fast iteration without custom component library; themeable. |
| State (UI) | React context + local state; Zustand only if needed | Avoid Redux; most state belongs to hooks and engines. |
| Storage | Dexie | Thinnest reliable wrapper over IndexedDB. |
| Schemas | Zod | Shared between runtime validation and TS types. |
| IDs | `ulid` | Sortable, collision-safe across merges. |
| PWA | `vite-plugin-pwa` (Workbox) | Handles service worker correctly. |
| Testing | Vitest + Testing Library + Playwright | Unit + integration + e2e. |
| Linting | ESLint + `eslint-plugin-import` (no-restricted-paths) | Enforces the layer boundaries from §6. |
| Charts | `recharts` or plain SVG | Defer decision until Stats screen. |

### Honest tradeoffs
- **iOS PWA**: installation is less obvious than Android; we need an "Install" help screen with device-specific instructions. Push notifications on iOS PWAs are weak (but we don't need them in MVP).
- **IndexedDB quotas / eviction**: browsers can evict non-persistent origin storage under pressure. We mitigate this by requesting `navigator.storage.persist()` on install (granted silently for installed PWAs in Chrome/Edge/Safari), which removes eviction risk. We do **not** nag users to export. If quota actually approaches full, one dismissible inline hint appears — nothing more.
- **Play Store distribution** costs a one-time developer fee (not free). If the user wants true free distribution, GitHub Pages + Android sideload `.apk` built via Bubblewrap is the honest free path.
- **No Next.js / server features** means no feature flags via server, no remote config. That's consistent with the constraints.

---

## 10. Testing strategy

### Priorities (in order)
1. **Game engine correctness** — any bug here corrupts stats and user trust.
2. **Data integrity** — backup round-trips and schema migrations must not lose data.
3. **Persistence layer** — a failed write should never leave inconsistent state.
4. **Stats calculations** — verifiable against hand-computed fixtures.
5. **Critical UX flows** — start/resume/finish session, export, import.

### Test types and targets
| Type | Tool | What it covers |
|---|---|---|
| Unit (pure) | Vitest | Every game engine: init, reduce for every legal action, bust detection, checkout detection, replay equivalence. Target ≥ 90% branches for `src/games/**` and `src/stats/**`. |
| Property-based (selective) | `fast-check` | X01: for any sequence of valid throws, current score + throws-taken must equal the invariant. Replay must equal live reduction. |
| Integration | Vitest + `fake-indexeddb` | Dexie repo read/write, schema migrations, storage adapter contract. |
| Backup round-trip | Vitest | Export → parse → validate → import into a fresh DB → deep-equal to source. Must pass for every schema version, covering forward migrations of old backup files. |
| Smoke e2e | Playwright | First launch, create profile, play a short X01 game, finish, view in history, export file, import file into a fresh origin. |
| Manual QA checklist | — | Mobile device checklist (see below). |

### Game engine test recipe (per game)
- Fixtures: hand-crafted sequences with known expected end states.
- Round-trip test: given a random sequence of valid actions, `replay(events)` must equal the live `reduce` accumulation.
- Undo/correction test: a session that ends with a corrected throw must produce the same final state as a session without the error, plus the correction trail.
- Invalid-input test: engine returns an error without mutating state.

### Migration test recipe
- A `fixtures/backups/v{N}.json` file for every shipped schema version.
- Test: import every older fixture into a current-schema DB; assert success and key counts.

### Minimal serious mobile QA plan (manual, pre-release)
- Fresh install → create profile → play 301 → undo last dart → finish → view summary. ✅
- Resume after force-closing mid-leg. ✅
- Play in airplane mode. ✅
- Export backup → delete site data → fresh install → import backup → verify counts. ✅
- Rotate device during active game; no state loss. ✅
- Low-memory condition (Chrome "Discard tab") then return. ✅
- Storage eviction simulation: fill a large test store, confirm the quota-exceeded banner appears and data is not silently dropped. ✅

---

## 11. Milestone plan

Each milestone is shippable, testable, and preserves architectural boundaries. No big-bang integrations.

| # | Milestone | Deliverable | Exit criteria |
|---|---|---|---|
| **M0** | Foundations | Vite + TS + React + Tailwind + ESLint (with layer boundaries) + Vitest + Playwright + CI. Empty shell with routes, theme toggle, PWA installability. | App installs as PWA; ESLint fails on layer violations; CI green. |
| **M1** | Domain + storage skeleton | Zod schemas for all entities; `StorageAdapter` interface; Dexie impl for `appSettings` and `profiles`; migration runner; fake-indexeddb tests. | Can create, read, update, delete profiles from the Profiles screen. |
| **M2** | Events + game engine scaffolding | `GameEngine` interface; `GameEvent` model; session lifecycle (`in_progress` → `completed`); minimal ActiveGame shell that can receive and store throw events for a "no-rules" game. | A session can be started, throws logged, and the event log inspected. |
| **M3** | **X01 playable** | X01 rule module (501/301/701, double-in, straight-out, double-out, masters-out), keypad UI, bust detection, checkout detection, **forfeit action**, throw-by-throw undo back to the first throw of the session, leg/session end. Post-session summary with full stat panel: 3-dart average, first-9 average, checkout %, darts thrown, **180s, 171+, 160+, 140+, 120+, 100+, 80+, 60+**, highest single-turn score, highest checkout, shortest leg (fewest darts), busts, session duration. | Full X01 (501/301/701) playable, resumable, finishable, and forfeitable on a phone. |
| **M4** | History + session detail | Sessions list with filters; per-session detail with per-leg breakdown and event replay view. | User can browse past sessions and inspect turn-by-turn. |
| **M5** | Export + Import (versioned) | `BackupManifest` v1; export to JSON file; import with parse → validate → migrate → merge/replace; round-trip test suite. | Backup/restore cycle works on mobile and desktop; import rejects corrupt/old files gracefully. |
| **M6** | Stats engine + dashboard | `stats/compute.ts`; per-profile KPIs; trend chart; caching with `sourceEventSeqMax`. | Stats screen shows meaningful KPIs and a trend line. |
| **M7** | Cricket | Cricket rule module + Active Game variant + Cricket-specific stats. | Full Cricket game playable with undo/corrections; stats update. |
| **M8** | Round the World + RTW scoring | Both RTW variants as rule modules. | Both games playable. |
| **M9** | Checkout practice | Random and targeted checkout drills; attempt tracking. | Checkout drills playable; stats show success rate per finish. |
| **M10** | Multi-profile sessions (turn-based) | Introduce `Session.participants[]`, turn ordering, participant selection UI, per-participant stats in summary. | Two profiles can play a single X01/Cricket session alternating turns on one device. |
| **M11** | **Computer opponent** | `src/games/ai/` module with `aiThrow(state, aiConfig, rng)`; four difficulty levels; `participants[]` extended with `kind: "ai"`; AI turn orchestration in the active-game hook; deterministic seeded tests. | Human vs. AI games for X01 and Cricket at all four difficulty levels are playable and deterministic under test. |
| **M12** | Polish + mobile QA hardening | Haptics, empty states, error boundaries, install help, iOS/Android install screens, quota-near-full inline hint, accessibility sweep. | Manual QA checklist passes on at least one Android and one iOS device; Lighthouse PWA score ≥ 90. |
| **M13 (optional)** | Capacitor wrap | Android `.apk`/`.aab` linked from GitHub Pages. | Sideloadable Android build exists. |

---

## 12. Decisions locked in (2026-04-18)

| # | Topic | Decision |
|---|---|---|
| 1 | Target devices | Reasonable modern defaults — latest two major versions of Chrome/Safari/Firefox/Edge; Android 10+ and iOS 15+ are tested but not hard-gated. Design for forward compatibility. |
| 2 | Distribution | GitHub Pages PWA for MVP. Capacitor wrap deferred to M13 as optional. |
| 3 | Import semantics | **Replace only**, with an explicit confirmation warning naming the counts being overwritten. Merge is intentionally not shipped. |
| 4 | Multi-profile in MVP | Single active profile in MVP. Multi-profile → M10; computer opponent → M11. |
| 5 | Undo depth | Throw-by-throw linear undo, all the way back to the first throw of the session. Crosses turn and leg boundaries. No redo stack in MVP. |
| 6 | X01 scope | 501, 301, 701 all ship in MVP. Double-in, straight-out, double-out, and masters-out all ship in MVP. **Forfeit** ships in MVP as a generic game action. |
| 7 | Post-session stats | Rich by default (see §11 M3). 3-dart avg, first-9 avg, checkout %, 180s, 171+, 160+, 140+, 120+, 100+, 80+, 60+, highest single-turn score, highest checkout, shortest leg, busts, session duration. Game-specific extras (e.g., Cricket MPR) added alongside each game. |
| 8 | Backup encryption | None. Plaintext, human-readable JSON. |
| 9 | Desktop layout | Identical to mobile, scaled for pointer input. No separate desktop-only screens. |
| 10 | Design system | Tailwind + small set of custom primitives. No heavyweight component library. |

### Core principle locked in: no backup nagging
The app does **not** prompt the user to back up — not on first launch, not at session end, not on a schedule. The app requests persistent storage silently on install, monitors quota silently, and only surfaces a backup hint if there is a real storage problem or the user is about to take a destructive action they initiated. The user owns the "when to back up" decision; the expectation is that backups are rare events (months apart on mobile), not part of routine play.

### Remaining unknowns (non-blocking)
- Whether to include a cosmetic per-profile accent color in MVP or later.
- Exact AI difficulty σ values — to be tuned empirically during M11.

---

## Self-challenge: weak points and guardrails

Before finalizing, I stress-tested this plan against failure modes I've seen in apps like this.

### Weak points I see
1. **Event log as truth is right, but tempting to cheat.** Under deadline pressure, a developer (or Claude) will mutate a cached `Throw` row "just this once" instead of appending a correction event. Over months this destroys the invariant.
   **Guardrail:** `Throw`/`Turn`/`Leg` rows are write-once from the event replayer only. The `storage` layer's repos expose no `update()` for these; only `upsertFromReplay()` that takes the full derived state. Enforce via code review checklist.
2. **Backup schema versioning gets skipped "just for now."** Then v2 ships and old backups break silently.
   **Guardrail:** `BackupManifest.schemaVersion` is required at the type level; there is literally no code path that writes a backup without it; import refuses files without it with a clear message.
3. **`ActiveGame` screen becoming a god component.** The screen is the natural place for Claude to pile on rules, animations, and undo logic.
   **Guardrail:** Per-file line budget (soft warning at 250, hard review at 400). Strict separation: screen composes `useActiveSession()` (view model) + `<ScoreDisplay/>` + `<Keypad/>` + `<TurnHistory/>`. Rule decisions never happen in the screen.
4. **Stats drift between games.** Each new game invents its own averages slightly differently.
   **Guardrail:** `stats/compute.ts` is the only place stats live; game modules declare which stat keys apply; a test asserts every new game module declares its applicable stats.
5. **IndexedDB migrations done "just in time" become risky.**
   **Guardrail:** Migration framework and a test fixture folder (`tests/fixtures/db/v{N}/`) exist from M1, before they're really needed. Every schema bump requires a forward migration + a test importing the previous version's fixture.
6. **Undo semantics diverging per game.**
   **Guardrail:** Undo is a generic engine-level action; each game's `reduce` must handle `{type: "undo"}` and `{type: "correct"}`. Shared tests enforce that replaying an event log with corrections equals the intended final state for every game.
7. **The "local-first → just add sync later" trap.** Teams who add sync as an afterthought end up rewriting storage.
   **Guardrail:** `StorageAdapter` is the only boundary that touches persisted state. Any future sync plugs in behind the adapter (as a mirroring layer), not alongside the domain. Documented as a non-goal for MVP in `README.md`.
8. **PWA cache bugs mask data loss.** Users see a stale shell while IndexedDB was cleared by the browser.
   **Guardrail:** Health-check on app start: verify DB opens and `appSettings` is readable; if not, route to an explicit "Something went wrong — import a backup or reset" screen. Never pretend everything is fine.

### Places Claude-generated code tends to get messy here
- **Giant switch statements in `ActiveGame`** with inline scoring math. → Forced out by layer rules (`screens/` cannot import from `games/engine/common/`; must go through engines).
- **Re-implementing the same stat formula** in screen code "because it's just a quick display calc." → Forced out by `stats/` being the only source of stat numbers; screens consume `StatsSummary` objects.
- **Ad hoc JSON shapes** for import/export that evolve implicitly. → Zod schema for `BackupManifest` is mandatory; tests fail if a new field is added without a schema update.
- **Dates and IDs generated inside engines.** → Engines take `now: () => string` and `id: () => string` as injected dependencies. Tests pass deterministic stubs.
- **Premature abstraction** into a "GameBuilder framework." → The plan keeps games as plain folders implementing a small interface. No meta-framework until three games are shipped and real commonalities have proven themselves.

### Likely future refactor points (acknowledged)
- The moment we add a **third distinct game type**, `games/engine/common/` will need pruning for what's truly shared vs game-specific.
- The **stats cache** may need sharding by profile when data sets grow; it's fine as a single record per session/profile for MVP.
- **Multi-profile session UI** on phones will push the keypad layout; expect a small redesign at M10.
- If/when **optional sync** is introduced, `StorageAdapter` will grow change-feed semantics. Plan it as a separate module (`sync/`) that observes the adapter, never the other way around.

---

*End of plan. Awaiting approval or edits before implementation begins.*
