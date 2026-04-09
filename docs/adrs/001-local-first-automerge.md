# ADR-001: Local-First Architecture with Automerge

## Status
Accepted

## Context
ScratchPad needs to work offline on Android and sync data when connectivity is available. Notes must never be lost due to network issues.

## Decision
Use Automerge CRDTs as the primary data layer:
- **Local storage**: IndexedDB via `@automerge/automerge-repo-storage-indexeddb`
- **Sync**: WebSocket via `@automerge/automerge-repo-network-websocket` connecting to SyncEngine
- **Single document**: All notes live in one Automerge document (`ScratchPadDoc`)
- **Fallback**: In-memory store for tests and development without external dependencies

## Consequences
- App works fully offline; sync happens opportunistically
- Conflict resolution is automatic via CRDTs
- Single document may need splitting if note count grows very large (future concern)
- No server-side query capability; all filtering happens client-side
