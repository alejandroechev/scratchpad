# ScratchPad

> **v0.3.0** — Tauri Android + Desktop native app

A personal scratchpad for quickly jotting down notes, pasting links, and capturing fleeting ideas.

## Features

- ✏️ **Quick-add bar** — always visible at top, enter to submit
- 📝 **Plain text notes** — with automatic URL detection and tappable link chips
- 🔍 **Search** — filter notes by content text in real-time
- 📋 **Note detail** — tap to expand, edit, save/discard changes
- 👆 **Swipe gestures** — swipe left to archive, swipe right to delete
- 🔄 **Offline-first sync** — Automerge CRDTs sync across devices via SyncEngine
- 🔐 **Device registration** — first-time setup with sync server password
- 📱 **Mobile-first UI** — designed for Android (Pixel 5 viewport), also runs on desktop
- ⓘ **Sync info panel** — tap ⓘ to see version, doc URL, and sync status

## Tech Stack

| Component       | Technology                          |
|-----------------|-------------------------------------|
| Language        | TypeScript                          |
| UI Framework    | React 19                            |
| Build Tool      | Vite                                |
| Styling         | Tailwind CSS 4                      |
| Native Shell    | Tauri 2 (Android + Desktop)         |
| Data Layer      | Automerge CRDTs                     |
| Sync            | SyncEngine (WebSocket + JWT auth)   |
| Local Storage   | IndexedDB (via automerge-repo)      |
| Testing         | Vitest + Playwright                 |

## Requirements

- Node.js 22+
- Rust toolchain (for Tauri)
- Android SDK (for mobile builds)

## Setup

1. Clone the repository
2. `npm install`
3. `cp .env.example .env` and fill in values
4. `npm run dev` — web dev server
5. `npm run tauri dev` — desktop dev
6. `npm run tauri android dev` — Android dev

## Commands

```bash
npm run dev                 # Vite dev server
npm run build               # Production build
npm run test                # Unit tests
npm run test:coverage       # Tests with coverage
npm run test:e2e            # Playwright E2E tests
npm run tauri dev           # Desktop development
npm run tauri build         # Desktop release build
npm run tauri android dev   # Android development
npm run tauri android build # Android release build
```

## Release & Update Flow

1. Bump the version in both `package.json` and `src-tauri/tauri.conf.json`
2. Push to master
3. CI builds the Android APK and creates a GitHub Release with the APK attached
4. Download the APK from the Releases page and install on your phone

## Sync Architecture

All devices share a single Automerge document (`VITE_AUTOMERGE_DOC_URL`). On first launch, the app prompts for a device name and the sync server registration key. Once registered, the device receives a JWT token used for authenticated WebSocket connections. Data syncs automatically in the background and works fully offline.

See [ADR-001](docs/adrs/001-local-first-automerge.md) and [ADR-002](docs/adrs/002-sync-auth-device-registration.md) for details.

## License

Private use.
