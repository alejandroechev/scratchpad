# ScratchPad

> **v0.11.1** — Markdown Checklists & Image Picker

A personal scratchpad for quickly jotting down notes, pasting links, and capturing fleeting ideas.

## Features

- ✏️ **Unified input bar** — single add/edit interface at top with autocomplete and enter to submit
- 📝 **Markdown notes** — full markdown rendering (headings, bold, links, code blocks, lists) with automatic URL detection
- ✅ **Clickable checklists** — GFM task list checkboxes (`- [ ]` / `- [x]`) are tappable in the detail view; NoteCard shows a progress badge (e.g., "2/5 ✓")
- 🔀 **Merge notes** — select multiple notes via "Seleccionar" and merge them with "Combinar (N)"
- 🏷️ **Labels** — freeform tags for organizing notes with autocomplete and filter chips
- 📷 **Image attachments** — unified image picker (camera + gallery) on mobile, with thumbnails and gallery view
- 🖼️ **Full-screen image viewer** — tap a thumbnail to open a full-screen overlay with pinch-to-zoom
- 📤 **Android share target** — share screenshots/images from any app directly to ScratchPad
- 🔍 **Search & filter** — search bar chip plus dynamic label filter chips in unified interface
- 💾 **Auto-save** — debounced 1-second auto-save in detail view; also saves on back/unmount
- ↩️ **Undo / Redo** — ↩/↪ buttons in the detail header on mobile for quick text corrections
- 📋 **Note detail** — tap to view rendered markdown; tap edit icon to switch to raw editor
- 👆 **Swipe action menu** — swipe left on a note card to reveal Archive, Image, Label, and Select actions
- 🖱️ **Context menu** — right-click on desktop for the same quick actions as swipe menu
- 📦 **Archive view** — dedicated page with text search, labels, dates, and image counts per note
- ➕ **Empty note creation** — tap Agregar with no text to create a blank note and jump to detail
- 🕐 **Sort by last updated** — notes sorted by most-recently-edited, with updatedAt shown on cards
- 📌 **Sticky header** — header, input bar, and filter chips stay pinned while scrolling
- 🎨 **Unified header colors** — input bar and filter row match the amber-600 header
- 📐 **Bottom safe area** — padding for phone navigation buttons
- 🔄 **Offline-first sync** — Automerge CRDTs + blob storage sync across devices via SyncEngine
- ⬆️ **Upload status** — real-time indicator showing pending blob uploads
- 🔐 **Device registration** — first-time setup with sync server password
- 👤 **Multi-user profiles** — hardcoded Ale/Dani profiles, each with their own synced document
- 📱 **Mobile-first UI** — designed for Android (Pixel 5 viewport), also runs on desktop and macOS
- 🍎 **macOS release** — unsigned .dmg for ARM (M1+) and Intel, auto-built via CI
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

## CLI

A command-line interface with feature parity for scripting and agent validation:

```bash
scratchpad add "Buy milk"                  # Create a note
scratchpad list                            # List active notes
scratchpad list -s "milk"                  # Search notes by text
scratchpad list -a                         # Include archived notes
scratchpad view <id>                       # View a note (renders checklist stats)
scratchpad edit <id> "Updated text"        # Edit a note's content
scratchpad archive <id>                    # Archive a note
scratchpad checkbox <id> <index>           # Toggle a GFM checkbox by index (0-based)
scratchpad delete <id>                     # Delete a note
```

## Release & Update Flow

1. Bump the version in both `package.json` and `src-tauri/tauri.conf.json`
2. Push to master
3. CI builds the Android APK (signed) and macOS DMGs (ARM + Intel), then creates a GitHub Release with all artifacts attached
4. Download the APK or DMG from the Releases page and install on your device

## Sync Architecture

Each user (Ale / Dani) has their own Automerge document. On first launch, the app shows a profile picker, then prompts for a device name and the sync server registration key. Once registered, the device receives a JWT token used for authenticated WebSocket connections. Data syncs automatically in the background and works fully offline. Images shared from other Android apps are received via share intent and stored as blob attachments.

See [ADR-001](docs/adrs/001-local-first-automerge.md), [ADR-002](docs/adrs/002-sync-auth-device-registration.md), [ADR-003](docs/adrs/003-android-share-intent.md), [ADR-004](docs/adrs/004-multi-user-profiles.md), [ADR-005](docs/adrs/005-swipe-action-menu.md), and [ADR-007](docs/adrs/007-markdown-checklists-replace-tasks.md) for details.

## License

Private use.
