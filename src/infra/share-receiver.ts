/**
 * Listens for Android share intents (text and images shared to ScratchPad).
 * Creates a new note with the shared content.
 *
 * Uses a queue-based approach: polls on startup and on each app focus event.
 * Only active on mobile (Tauri Android/iOS).
 * All imports are dynamic to avoid triggering automerge init on desktop.
 */

async function handleTextIntent(text: string): Promise<void> {
  const { createNote } = await import("./store-provider.js");
  await createNote(text);
  console.log("📝 Nota creada desde texto compartido:", text.slice(0, 50));
}

async function handleImageIntent(contentUri: string): Promise<void> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const { createNote, addImage, storeImageBlob } = await import("./store-provider.js");

  const bytes = await readFile(contentUri);
  const file = new File([bytes], "shared-image.jpg", { type: "image/jpeg" });
  const { blobId, sizeBytes } = await storeImageBlob(file);
  const note = await createNote("");
  await addImage(note.id, {
    blobId,
    fileName: "shared-image.jpg",
    sizeBytes,
    createdAt: new Date().toISOString(),
  });
  console.log("📸 Nota creada desde imagen compartida:", note.id);
}

function isContentUri(raw: string): boolean {
  return raw.startsWith("content://") || raw.startsWith("file://");
}

/** Extract EXTRA_TEXT from a raw Android intent URI string */
export function extractTextFromIntent(raw: string): string | null {
  const match = raw.match(/S\.android\.intent\.extra\.TEXT=([^;]*)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return null;
}

async function drainIntentQueue(): Promise<void> {
  const { popIntentQueue } = await import(
    "tauri-plugin-mobile-sharetarget-api"
  );
  let raw = await popIntentQueue();
  while (raw) {
    try {
      if (isContentUri(raw)) {
        await handleImageIntent(raw);
      } else if (raw.startsWith("#Intent;")) {
        const text = extractTextFromIntent(raw);
        if (text) {
          await handleTextIntent(text);
        } else {
          console.warn("Intent sin texto extraíble:", raw.slice(0, 100));
        }
      } else {
        await handleTextIntent(raw);
      }
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
