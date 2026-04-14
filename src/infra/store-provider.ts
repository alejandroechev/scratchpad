/**
 * Store Provider — selects between Automerge (local-first) or in-memory stores.
 *
 * Priority: VITE_STORAGE_BACKEND env var -> automerge (default) -> memory (fallback for tests)
 */
import type { Note, NoteImage } from "../domain/models/note.js";
import type { NoteFilters } from "../domain/services/note-repository.js";
import { InMemoryNoteStore } from "./memory/note-store.js";

const automerge = () => import("./automerge/note-store.js");

type StorageBackend = "automerge" | "memory";

function detectBackend(): StorageBackend {
  const explicit = import.meta.env.VITE_STORAGE_BACKEND as string | undefined;
  if (explicit === "memory") return "memory";
  return "automerge";
}

const backend = detectBackend();
const memoryStore = new InMemoryNoteStore();

export function getStorageBackend(): StorageBackend {
  return backend;
}

export async function createNote(content: string): Promise<Note> {
  if (backend === "automerge") return (await automerge()).createNoteAsync(content);
  return memoryStore.create(content);
}

export async function getNoteById(id: string): Promise<Note | null> {
  if (backend === "automerge") return (await automerge()).getNoteById(id);
  return memoryStore.getById(id);
}

export async function listNotes(filters?: NoteFilters): Promise<Note[]> {
  if (backend === "automerge") return (await automerge()).listNotes(filters);
  return memoryStore.list(filters);
}

export async function updateNote(id: string, content: string): Promise<Note> {
  if (backend === "automerge") return (await automerge()).updateNote(id, content);
  return memoryStore.update(id, content);
}

export async function archiveNote(id: string): Promise<Note> {
  if (backend === "automerge") return (await automerge()).archiveNote(id);
  return memoryStore.archive(id);
}

export async function unarchiveNote(id: string): Promise<Note> {
  if (backend === "automerge") return (await automerge()).unarchiveNote(id);
  return memoryStore.unarchive(id);
}

export async function deleteNote(id: string): Promise<void> {
  if (backend === "automerge") return (await automerge()).deleteNote(id);
  return memoryStore.delete(id);
}

export async function addImage(noteId: string, image: NoteImage): Promise<Note> {
  if (backend === "automerge") return (await automerge()).addImage(noteId, image);
  return memoryStore.addImage(noteId, image);
}

export async function removeImage(noteId: string, blobId: string): Promise<Note> {
  if (backend === "automerge") return (await automerge()).removeImage(noteId, blobId);
  return memoryStore.removeImage(noteId, blobId);
}

export async function addLabel(noteId: string, label: string): Promise<Note> {
  if (backend === "automerge") return (await automerge()).addLabel(noteId, label);
  return memoryStore.addLabel(noteId, label);
}

export async function removeLabel(noteId: string, label: string): Promise<Note> {
  if (backend === "automerge") return (await automerge()).removeLabel(noteId, label);
  return memoryStore.removeLabel(noteId, label);
}

export async function mergeNotes(targetId: string, sourceIds: string[]): Promise<Note> {
  if (backend === "automerge") return (await automerge()).mergeNotes(targetId, sourceIds);
  return memoryStore.mergeNotes(targetId, sourceIds);
}

export async function toggleTask(id: string): Promise<Note> {
  if (backend === "automerge") return (await automerge()).toggleTask(id);
  return memoryStore.toggleTask(id);
}

export async function toggleTaskDone(id: string): Promise<Note> {
  if (backend === "automerge") return (await automerge()).toggleTaskDone(id);
  return memoryStore.toggleTaskDone(id);
}

/** Subscribe to remote doc changes. Returns unsubscribe function. No-op for memory backend. */
export async function onDocChange(callback: () => void): Promise<() => void> {
  if (backend === "automerge") {
    const { onDocChange } = await import("./automerge/repo.js");
    return onDocChange(callback);
  }
  return () => {};
}
