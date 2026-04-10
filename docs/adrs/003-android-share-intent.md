# ADR-003: Android Share Intent via tauri-plugin-mobile-sharetarget

## Status
Accepted

## Context
Users want to share screenshots from Android directly into ScratchPad. Android's
share system delivers images via `ACTION_SEND` intents with a content URI.

Tauri 2 doesn't natively support Android share intents, so we need a plugin.

## Decision
We use **tauri-plugin-mobile-sharetarget** (by IT-ess) — a Tauri 2-compatible
plugin that queues incoming intents so they aren't lost if the webview isn't ready.

### Key design choices

1. **Queue-based polling** — The plugin stores intents in a Rust-side FIFO queue.
   The frontend drains the queue on startup and on every `tauri://focus` event,
   which covers both cold-start and warm-resume scenarios.

2. **Manifest patching in CI** — `tauri android init` regenerates
   `AndroidManifest.xml`, so we can't commit intent filters directly. Instead,
   `src-tauri/android-patches/patch-manifest.sh` injects the `<intent-filter>`
   after `tauri android init` runs in the GitHub Actions workflow.

3. **Dynamic imports** — The share receiver uses dynamic `import()` for all
   mobile-only modules so the code tree-shakes cleanly on desktop and tests
   pass without the native plugin present.

4. **Separate mobile capability** — `src-tauri/capabilities/mobile.json` grants
   the `mobile-sharetarget:default` permission only on Android/iOS platforms.

## Consequences
- Shared images create a new note automatically (no user prompt).
- The plugin requires the Rust lib name in its Kotlin code to match
  `[lib] name` in `Cargo.toml`. If the plugin's default (`tauri_app_lib`) doesn't
  match our lib name (`app_lib`), a fork or patch of the Kotlin source is needed.
- iOS share support would require additional Xcode configuration (Share Extension
  + deep-link plugin); this ADR covers Android only.
