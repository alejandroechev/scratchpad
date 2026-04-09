# ScratchPad

> **v0.1.0** — Tauri Android native app

A personal scratchpad for quickly jotting down notes, pasting links, and capturing fleeting ideas.

## Features

- (to be filled as features are implemented)

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
