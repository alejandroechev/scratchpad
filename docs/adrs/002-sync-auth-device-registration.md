# ADR-002: Sync Auth via Device Registration

## Status
Accepted

## Context
The SyncEngine server supports optional JWT-based authentication. When enabled, devices must register with a shared registration key before they can sync. Without auth, anyone who knows the WebSocket URL could connect and read/modify the Automerge document.

## Decision
Implement client-side device registration, matching the pattern established in medical-data-app:

1. **SyncAuthGate** wraps the app and blocks UI until the device is registered
2. **auth.ts** handles the registration flow:
   - Checks server `/health` endpoint for `authEnabled` flag
   - If auth is enabled and no token is stored, shows registration form
   - User provides device name + registration key (shared secret)
   - Server returns a JWT token, stored in localStorage
   - Token is appended to WebSocket URL as `?token=<jwt>`
3. **Offline resilience**: If the server is unreachable but a token exists, the app proceeds optimistically (data is local-first anyway)

### Shared Document URL
All devices connect to the same Automerge document via `VITE_AUTOMERGE_DOC_URL` (set in `.env` and CI variables). This ensures notes sync across phone and desktop.

## Consequences
- First launch on any new device requires the registration key (one-time)
- Subsequent launches are automatic (token in localStorage)
- If the server disables auth, the gate passes through transparently
- Token invalidation requires re-registration (clearing localStorage)
- The registration key is a shared secret — all devices use the same key to register
