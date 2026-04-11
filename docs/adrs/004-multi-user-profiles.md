# ADR-004: Multi-User Profiles with Separate Automerge Documents

## Status
Accepted

## Context
The app is used by two people (Ale and Dani) who want completely separate notes. Both may use the same device (shared tablet) or different devices (phone, desktop, macOS laptop). Notes must never mix between users.

## Decision
Implement per-user profiles with hardcoded Automerge document URLs:

1. **Two hardcoded profiles** in `profile-store.ts`:
   - Ale: `automerge:25avBccAaFeLJJ8qVEBq8gBf4Ht3` (existing doc)
   - Dani: `automerge:3KxcCpTNo3eau32TAemXvRQdXyaD` (new doc)

2. **Profile selection in SyncAuthGate**: profile picker buttons shown before/alongside device registration. Selected profile stored in `localStorage` (`scratchpad-active-profile`).

3. **repo.ts priority chain**: `activeProfile.docUrl` → `VITE_AUTOMERGE_DOC_URL` → `localStorage` fallback.

4. **Profile switching**: tap profile badge in header → clears active profile + resets doc handle → shows SyncAuthGate again.

## Why hardcoded (not dynamic)?
- Only two users, no need for registration flow
- Doc URLs must be pre-created on the sync server (auth required)
- Simplest possible implementation — revisit if more users needed

## Consequences
- Each user's notes are in a completely separate Automerge document
- Users on the same device select their profile on first launch (one-time)
- Profile is device-local config (localStorage), not synced
- Existing installs (pre-v0.6.0) will be prompted to select a profile on first update — Ale's doc URL is the same, so no data loss
- Adding new users requires a code change (create doc on server, add to PROFILES array)
- Device registration (JWT token) is shared across profiles on the same device
