/**
 * Platform-aware utilities for opening URLs and reading clipboard.
 * Uses Tauri plugins when available, falls back to browser APIs.
 */

let isTauri = false;
try {
  isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
} catch {
  // Not in Tauri
}

/** Open a URL in the system default browser */
export async function openUrl(url: string): Promise<void> {
  if (isTauri) {
    try {
      const { openUrl: tauriOpen } = await import("@tauri-apps/plugin-opener");
      await tauriOpen(url);
      return;
    } catch (err) {
      console.warn("Tauri opener failed, falling back to window.open:", err);
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Read text from clipboard */
export async function readClipboard(): Promise<string> {
  if (isTauri) {
    try {
      const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
      const text = await readText();
      return text || "";
    } catch (err) {
      console.warn("Tauri clipboard failed, falling back to navigator.clipboard:", err);
    }
  }
  try {
    return await navigator.clipboard.readText();
  } catch (err) {
    console.warn("Clipboard read failed:", err);
    return "";
  }
}
