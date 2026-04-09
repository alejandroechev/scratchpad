# ScratchPad

> **v0.1.0** — Tauri Android native app

A personal scratchpad for quickly jotting down notes, pasting links, and capturing fleeting ideas.

## Features

- ✏️ **Quick-add bar** — always visible at top, enter to submit
- 📝 **Plain text notes** — with automatic URL detection and tappable link chips
- 🔍 **Search** — filter notes by content text in real-time
- 📋 **Note detail** — tap to expand, edit, save/discard changes
- 📦 **Archive** — archive notes to hide from main list
- 🗑️ **Delete** — permanently remove notes
- 🔄 **Offline-first sync** — Automerge CRDTs sync across devices via SyncEngine
- 📱 **Mobile-first UI** — designed for Android (Pixel 5 viewport)

## Tech Stack

| Component       | Technology                          |
|-----------------|-------------------------------------|
| Language        | TypeScript                          |
| UI Framework    | React 19                            |
| Build Tool      | Vite                                |
| Styling         | Tailwind CSS 4                      |
| Native Shell    | Tauri 2 (Android)                   |
| Data Layer      | Automerge CRDTs                     |
| Sync            | SyncEngine (WebSocket)              |
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
5. `npm run tauri android dev` — Android dev

## Commands

```bash
npm run dev              # Vite dev server
npm run build            # Production build
npm run test             # Unit tests
npm run test:coverage    # Tests with coverage
npm run test:e2e         # Playwright E2E tests
npm run tauri android dev   # Android development
npm run tauri android build # Android release build
```

## License

Private use.
