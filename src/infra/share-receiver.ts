/**
 * Listens for Android share intents (images shared to ScratchPad).
 * Creates a new note with the shared image attached.
 *
 * Uses a queue-based approach: polls on startup and on each app focus event.
 * Only active on mobile (Tauri Android/iOS).
 */
import { storeAndSyncBlob } from "./automerge/blob-sync.js";
import { createNote, addImage } from "./store-provider.js";

async function handleImageIntent(contentUri: string): Promise<void> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const bytes = await readFile(contentUri);
  const file = new File([bytes], "shared-image.jpg", { type: "image/jpeg" });
  const { blobId, sizeBytes } = await storeAndSyncBlob(file);
  const note = await createNote("");
  await addImage(note.id, {
    blobId,
    fileName: "shared-image.jpg",
    sizeBytes,
    createdAt: new Date().toISOString(),
  });
  console.log("📸 Nota creada desde imagen compartida:", note.id);
}

async function drainIntentQueue(): Promise<void> {
  const { popIntentQueue } = await import(
    "tauri-plugin-mobile-sharetarget-api"
  );
  let raw = await popIntentQueue();
  while (raw) {
    try {
      await handleImageIntent(raw);
    } catch (err) {
      console.error("Error procesando intent compartido:", err);
    }
    raw = await popIntentQueue();
  }
}

export async function initShareReceiver(): Promise<void> {
  try {
    const { listen } = await import("@tauri-apps/api/event");

    // Drain any intents that arrived before webview was ready
    await drainIntentQueue();

    // Re-check queue each time the app regains focus
    await listen("tauri://focus", () => {
      drainIntentQueue();
    });

    console.log("📱 Share receiver inicializado");
  } catch {
    // Not on mobile or plugin not available
    console.log("Share receiver no disponible (modo escritorio)");
  }
}
