import { Client } from "./client/index.js";
import type { NoteSnapshot } from "./client/index.js";
import type { Note, NoteImage } from "../../domain/models/note.js";
import type { NoteFilters } from "../../domain/services/note-repository.js";

const SYNC_SERVER_URL = import.meta.env.VITE_SYNC_SERVER_URL || "";
const VERDANT_LIBRARY_ID = import.meta.env.VITE_VERDANT_LIBRARY_ID || "scratchpad-default";

let clientInstance: Client | null = null;
let clientReady: Promise<Client> | null = null;

export function getClient(): Promise<Client> {
  if (clientInstance) return Promise.resolve(clientInstance);
  if (clientReady) return clientReady;

  clientReady = (async () => {
    const syncConfig = SYNC_SERVER_URL
      ? {
          authEndpoint: `${SYNC_SERVER_URL}/verdant/auth/${VERDANT_LIBRARY_ID}`,
          initialPresence: {},
          defaultProfile: {},
        }
      : undefined;

    const client = new Client({
      namespace: `scratchpad-${VERDANT_LIBRARY_ID}`,
      sync: syncConfig,
    });
    clientInstance = client;
    return client;
  })();

  return clientReady;
}

function snapshotToNote(s: NoteSnapshot): Note {
  return {
    id: s.id,
    content: s.content,
    images: (s.images || []).map((img) => ({
      blobId: img.file?.url || "",
      fileName: img.fileName,
      sizeBytes: img.sizeBytes,
      createdAt: img.createdAt,
    })),
    labels: [...(s.labels || [])],
    isTask: s.isTask,
    taskDone: s.taskDone,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    archived: s.archived,
  };
}

export async function createNoteAsync(content: string): Promise<Note> {
  const client = await getClient();
  const now = new Date().toISOString();
  const note = await client.notes.put({
    content,
    createdAt: now,
    updatedAt: now,
  });
  return snapshotToNote(note.getSnapshot());
}

export async function getNoteById(id: string): Promise<Note | null> {
  const client = await getClient();
  const note = await client.notes.get(id).resolved;
  if (!note) return null;
  return snapshotToNote(note.getSnapshot());
}

export async function listNotes(filters?: NoteFilters): Promise<Note[]> {
  const client = await getClient();
  const allNotes = await client.notes.findAll().resolved;

  let results = allNotes.map((n) => snapshotToNote(n.getSnapshot()));

  if (!filters?.includeArchived) {
    results = results.filter((n) => !n.archived);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter((n) => n.content.toLowerCase().includes(q));
  }
  if (filters?.label) {
    results = results.filter((n) => n.labels?.includes(filters.label!));
  }
  if (filters?.tasksOnly) {
    results = results.filter((n) => n.isTask === true);
  }

  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return results;
}

export async function updateNote(id: string, content: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(id).resolved;
  if (!note) throw new Error(`Note not found: ${id}`);
  note.set("content", content);
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function archiveNote(id: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(id).resolved;
  if (!note) throw new Error(`Note not found: ${id}`);
  note.set("archived", true);
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function unarchiveNote(id: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(id).resolved;
  if (!note) throw new Error(`Note not found: ${id}`);
  note.set("archived", false);
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function deleteNote(id: string): Promise<void> {
  const client = await getClient();
  await client.notes.delete(id);
}

export async function addImage(noteId: string, image: NoteImage): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const images = note.get("images");
  images.push({
    fileName: image.fileName,
    sizeBytes: image.sizeBytes,
    createdAt: image.createdAt,
  });
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function removeImage(noteId: string, blobId: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const images = note.get("images");
  const snapshot = images.getSnapshot();
  const idx = snapshot.findIndex((img) => (img.file?.url || "") === blobId);
  if (idx === -1) throw new Error(`Image not found: ${blobId}`);
  images.delete(idx);
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function addLabel(noteId: string, label: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const labels = note.get("labels");
  const existing = labels.getSnapshot();
  if (!existing.includes(label)) {
    labels.push(label);
    note.set("updatedAt", new Date().toISOString());
  }
  return snapshotToNote(note.getSnapshot());
}

export async function removeLabel(noteId: string, label: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const labels = note.get("labels");
  const snapshot = labels.getSnapshot();
  const idx = snapshot.indexOf(label);
  if (idx !== -1) {
    labels.delete(idx);
    note.set("updatedAt", new Date().toISOString());
  }
  return snapshotToNote(note.getSnapshot());
}

export async function toggleTask(id: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(id).resolved;
  if (!note) throw new Error(`Note not found: ${id}`);
  const isTask = !note.get("isTask");
  note.set("isTask", isTask);
  if (!isTask) note.set("taskDone", false);
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function toggleTaskDone(id: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(id).resolved;
  if (!note) throw new Error(`Note not found: ${id}`);
  note.set("taskDone", !note.get("taskDone"));
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function mergeNotes(targetId: string, sourceIds: string[]): Promise<Note> {
  const client = await getClient();
  const target = await client.notes.get(targetId).resolved;
  if (!target) throw new Error(`Note not found: ${targetId}`);

  for (const sourceId of sourceIds) {
    const source = await client.notes.get(sourceId).resolved;
    if (!source) throw new Error(`Note not found: ${sourceId}`);

    const sourceContent = source.get("content");
    if (sourceContent) {
      const existing = target.get("content");
      target.set("content", existing ? existing + "\n---\n" + sourceContent : sourceContent);
    }

    // Merge labels
    const sourceLabels = source.get("labels").getSnapshot();
    const targetLabels = target.get("labels");
    const existingLabels = new Set(targetLabels.getSnapshot());
    for (const label of sourceLabels) {
      if (!existingLabels.has(label)) {
        targetLabels.push(label);
      }
    }

    // Archive source
    source.set("archived", true);
    source.set("updatedAt", new Date().toISOString());
  }

  target.set("updatedAt", new Date().toISOString());
  return snapshotToNote(target.getSnapshot());
}

export async function onDocChange(callback: () => void): Promise<() => void> {
  const client = await getClient();
  return client.subscribe("operation", callback);
}
