# TTN Darts Trainer

A local-first darts training PWA for solo practice and casual turn-based multiplayer on a single device.

- **No accounts. No cloud. No telemetry.** Your data lives on your device.
- **Offline-first.** Once installed, every feature works with no network.
- **Manual export/import is the only recovery path.** There is no sync.

## Games

- **X01** — 301 / 501 / 701 with double-in, double-out, masters-out, or straight-out rules.
- **X01 vs Computer** — same rules, against an AI opponent at difficulty 1 (beginner) through 10 (expert).
- **Cricket** — close 15 through 20 plus bull, outscore your opponents.
- **Round the World** — work through targets in sequence (1–20 plus bull) under several mode and order options.
- **RTW Scoring** — Round the World with weighted per-throw scoring (Miss=0, Single=1, Double=2, Triple=3).
- **Checkout Practice** — random or targeted finishes with configurable attempts per finish.

Multi-profile turn-based sessions are supported on a single device for X01, Cricket, and RTW.

## Install as an app

The app is delivered as a Progressive Web App. Once you visit the hosted site in a supported browser, you can install it to your home screen and launch it like any native app.

- **iOS (Safari):** open the site, tap the Share button, then **Add to Home Screen**.
- **Android (Chrome / Edge):** open the site, accept the install prompt, or open the browser menu and choose **Install app**.
- **Desktop (Chrome / Edge):** look for the install icon in the address bar, or open the browser menu and choose **Install**.

Once installed the app works offline.

## Data and backups

All data — profiles, sessions, throws, stats — is stored on your device in IndexedDB. The app requests persistent storage on first launch so the browser will not evict it.

There is no cloud copy. The only way to move data between devices, or recover after uninstalling, is to export a backup file from **Settings → Data → Export backup** and import it on the other device or after reinstall. Backup files are plaintext JSON and version-tagged so they remain importable across app updates.

Import is **Replace-only** — importing a backup wipes the current device's data and replaces it with the contents of the file. Confirmation is required.

## For developers

```bash
git clone https://github.com/timtomnow/dart-trainer.git
cd dart-trainer
npm install
npm run dev          # local dev server
npm run typecheck    # strict TS
npm run lint         # ESLint with layer boundaries enforced
npm run test:run     # Vitest unit and integration tests
npm run test:e2e     # Playwright smoke flows
npm run build        # production build to dist/
npm run preview      # serve the production build
```

### Stack

- Vite + TypeScript (strict)
- React 18 + Tailwind CSS, small set of custom UI primitives
- React Router (data router)
- Zod schemas in `src/domain/`; TypeScript types derived from them
- Dexie over IndexedDB, wrapped by `StorageAdapter`
- ULID for all entity IDs
- Vitest, Testing Library, `fake-indexeddb`, Playwright
- `vite-plugin-pwa` (Workbox) for the service worker and manifest

### Architecture

Architectural rules — layer boundaries, purity of game engines, the event-log-as-truth model, backup versioning, file size budgets — are documented in [CLAUDE.md](CLAUDE.md). Read it before making structural changes. ESLint `no-restricted-paths` enforces the layer boundaries automatically.

Each game is a self-contained folder under `src/games/<id>/` implementing the `GameEngine` interface — pure, no UI, no storage. Adding a new game does not require changes to the app shell.

### Issues

Bugs, ideas, and feedback: <https://github.com/timtomnow/dart-trainer/issues>

---

© timtomnow — <https://github.com/timtomnow/dart-trainer>
