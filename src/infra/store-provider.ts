/**
 * Store Provider — selects between Verdant (default), Automerge (legacy), or in-memory stores.
 *
 * Priority: VITE_STORAGE_BACKEND env var -> verdant (default) -> memory (fallback for tests)
 */
import type { Note, NoteImage } from "../domain/models/note.js";
import type { NoteFilters } from "../domain/services/note-repository.js";
import { InMemoryNoteStore } from "./memory/note-store.js";

const automerge = () => import("./automerge/worker-client.js");
const verdant = () => import("./verdant/note-store.js");

type StorageBackend = "verdant" | "automerge" | "memory";

function detectBackend(): StorageBackend {
  const explicit = import.meta.env.VITE_STORAGE_BACKEND as string | undefined;
  if (explicit === "memory") return "memory";
  if (explicit === "automerge") return "automerge";
  if (explicit === "verdant") return "verdant";
  return "automerge";
}

const backend = detectBackend();
const memoryStore = new InMemoryNoteStore();

export function getStorageBackend(): StorageBackend {
  return backend;
}

export async function createNote(content: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).createNoteAsync(content);
  if (backend === "automerge") return (await automerge()).createNoteAsync(content);
  return memoryStore.create(content);
}

export async function getNoteById(id: string): Promise<Note | null> {
  if (backend === "verdant") return (await verdant()).getNoteById(id);
  if (backend === "automerge") return (await automerge()).getNoteById(id);
  return memoryStore.getById(id);
}

export async function listNotes(filters?: NoteFilters): Promise<Note[]> {
  if (backend === "verdant") return (await verdant()).listNotes(filters);
  if (backend === "automerge") return (await automerge()).listNotes(filters);
  return memoryStore.list(filters);
}

export async function updateNote(id: string, content: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).updateNote(id, content);
  if (backend === "automerge") return (await automerge()).updateNote(id, content);
  return memoryStore.update(id, content);
}

export async function archiveNote(id: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).archiveNote(id);
  if (backend === "automerge") return (await automerge()).archiveNote(id);
  return memoryStore.archive(id);
}

export async function unarchiveNote(id: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).unarchiveNote(id);
  if (backend === "automerge") return (await automerge()).unarchiveNote(id);
  return memoryStore.unarchive(id);
}

export async function deleteNote(id: string): Promise<void> {
  if (backend === "verdant") return (await verdant()).deleteNote(id);
  if (backend === "automerge") return (await automerge()).deleteNote(id);
  return memoryStore.delete(id);
}

export async function addImage(noteId: string, image: NoteImage): Promise<Note> {
  if (backend === "verdant") return (await verdant()).addImage(noteId, image);
  if (backend === "automerge") return (await automerge()).addImage(noteId, image);
  return memoryStore.addImage(noteId, image);
}

export async function removeImage(noteId: string, blobId: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).removeImage(noteId, blobId);
  if (backend === "automerge") return (await automerge()).removeImage(noteId, blobId);
  return memoryStore.removeImage(noteId, blobId);
}

export async function addLabel(noteId: string, label: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).addLabel(noteId, label);
  if (backend === "automerge") return (await automerge()).addLabel(noteId, label);
  return memoryStore.addLabel(noteId, label);
}

export async function removeLabel(noteId: string, label: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).removeLabel(noteId, label);
  if (backend === "automerge") return (await automerge()).removeLabel(noteId, label);
  return memoryStore.removeLabel(noteId, label);
}

export async function mergeNotes(targetId: string, sourceIds: string[]): Promise<Note> {
  if (backend === "verdant") return (await verdant()).mergeNotes(targetId, sourceIds);
  if (backend === "automerge") return (await automerge()).mergeNotes(targetId, sourceIds);
  return memoryStore.mergeNotes(targetId, sourceIds);
}

export async function toggleChecklistItem(noteId: string, itemIndex: number): Promise<Note> {
  if (backend === "verdant") return (await verdant()).toggleChecklistItem(noteId, itemIndex);
  if (backend === "automerge") return (await automerge()).toggleChecklistItem(noteId, itemIndex);
  return memoryStore.toggleChecklistItem(noteId, itemIndex);
}

export async function convertToChecklist(noteId: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).convertToChecklist(noteId);
  if (backend === "automerge") return (await automerge()).convertToChecklist(noteId);
  return memoryStore.convertToChecklist(noteId);
}

export async function convertToNote(noteId: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).convertToNote(noteId);
  if (backend === "automerge") return (await automerge()).convertToNote(noteId);
  return memoryStore.convertToNote(noteId);
}

export async function addChecklistItem(noteId: string, text: string): Promise<Note> {
  if (backend === "verdant") return (await verdant()).addChecklistItem(noteId, text);
  if (backend === "automerge") return (await automerge()).addChecklistItem(noteId, text);
  return memoryStore.addChecklistItem(noteId, text);
}

export async function removeChecklistItem(noteId: string, itemIndex: number): Promise<Note> {
  if (backend === "verdant") return (await verdant()).removeChecklistItem(noteId, itemIndex);
  if (backend === "automerge") return (await automerge()).removeChecklistItem(noteId, itemIndex);
  return memoryStore.removeChecklistItem(noteId, itemIndex);
}

/** Subscribe to remote doc changes. Returns unsubscribe function. No-op for memory backend. */
export async function onDocChange(callback: () => void): Promise<() => void> {
  if (backend === "verdant") {
    const { onDocChange } = await import("./verdant/note-store.js");
    return onDocChange(callback);
  }
  if (backend === "automerge") {
    const { onDocChange } = await import("./automerge/worker-client.js");
    return onDocChange(callback);
  }
  return () => {};
}

/** Store an image blob and return its ID. For verdant, returns a placeholder (files are handled inline). */
export async function storeImageBlob(file: File): Promise<{ blobId: string; sizeBytes: number }> {
  if (backend === "automerge") {
    const { storeAndSyncBlob } = await import("./automerge/blob-sync.js");
    const result = await storeAndSyncBlob(file);
    return { blobId: result.blobId, sizeBytes: result.sizeBytes };
  }
  // For verdant and memory, images are stored inline with the note — no separate blob store
  return { blobId: `local-${Date.now()}`, sizeBytes: file.size };
}

/** Get a displayable URL for a blob/file. */
export async function getBlobUrl(blobId: string): Promise<string | null> {
  if (backend === "verdant") {
    const { getVerdantFileUrl } = await import("./verdant/note-store.js");
    return getVerdantFileUrl(blobId);
  }
  if (backend === "automerge") {
    const { getBlobUrl } = await import("./automerge/blob-sync.js");
    return getBlobUrl(blobId);
  }
  return null;
}

/** Get count of pending blob uploads. For verdant, always 0 (built-in file sync). */
export async function getPendingBlobCount(): Promise<number> {
  if (backend === "automerge") {
    const { getPendingCount } = await import("./automerge/blob-sync.js");
    return getPendingCount();
  }
  return 0;
}

/** Reset the doc handle / client state. Used when switching profiles. */
export function resetBackend(): void {
  if (backend === "verdant") {
    import("./verdant/note-store.js").then(({ resetVerdantClient }) => resetVerdantClient());
  }
  if (backend === "automerge") {
    import("./automerge/repo.js").then(({ resetDocHandle }) => resetDocHandle());
  }
}
