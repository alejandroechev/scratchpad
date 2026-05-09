import { Client } from "./client/index.js";
import type { NoteSnapshot, NoteImagesItemSnapshot } from "./client/index.js";
import type { Note, NoteImage } from "../../domain/models/note.js";
import type { NoteFilters } from "../../domain/services/note-repository.js";
import { getActiveProfile } from "../profile-store.js";

const SYNC_SERVER_URL = import.meta.env.VITE_SYNC_SERVER_URL || "";
const HTTP_SERVER_URL = SYNC_SERVER_URL.replace(/^ws/, "http");

function getLibraryId(): string {
  const profile = getActiveProfile();
  return profile ? `scratchpad-${profile.id}` : "scratchpad-default";
}

let clientInstance: Client | null = null;
let clientReady: Promise<Client> | null = null;
let activeLibraryId: string | null = null;

export function getClient(): Promise<Client> {
  const libraryId = getLibraryId();

  // Reset client if profile changed
  if (clientInstance && activeLibraryId !== libraryId) {
    clientInstance.close();
    clientInstance = null;
    clientReady = null;
  }

  if (clientInstance) return Promise.resolve(clientInstance);
  if (clientReady) return clientReady;

  activeLibraryId = libraryId;

  clientReady = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let syncConfig: any;

    if (HTTP_SERVER_URL) {
      // Get the stored sync engine JWT for authenticating with the Verdant auth endpoint
      const { getStoredToken } = await import("../automerge/auth.js");
      const syncToken = getStoredToken();
      const authUrl = `${HTTP_SERVER_URL}/verdant/auth/${libraryId}`;

      syncConfig = {
        fetchAuth: async () => {
          const headers: Record<string, string> = {};
          if (syncToken) headers["Authorization"] = `Bearer ${syncToken}`;
          const res = await fetch(authUrl, { headers });
          if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
          return res.json();
        },
        initialPresence: {},
        defaultProfile: {},
      };
    }

    const client = new Client({
      namespace: `scratchpad-${libraryId}`,
      sync: syncConfig,
    });
    clientInstance = client;
    return client;
  })();

  return clientReady;
}

export function resetVerdantClient(): void {
  if (clientInstance) {
    clientInstance.close();
  }
  clientInstance = null;
  clientReady = null;
  activeLibraryId = null;
}

function snapshotToNote(s: NoteSnapshot): Note {
  return {
    id: s.id,
    content: s.content,
    images: (s.images || []).map((img: NoteImagesItemSnapshot) => ({
      blobId: img.file?.id || "",
      fileName: img.fileName,
      sizeBytes: img.sizeBytes,
      createdAt: img.createdAt,
    })),
    labels: [...(s.labels || [])],
    checklistItems: (s.checklistItems ?? []).map((item: { text: string; done: boolean }) => ({
      text: item.text,
      done: item.done,
    })),
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
    results = results.filter((n: Note) => !n.archived);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter((n: Note) => n.content.toLowerCase().includes(q));
  }
  if (filters?.label) {
    results = results.filter((n: Note) => n.labels?.includes(filters.label!));
  }
  results.sort((a: Note, b: Note) => b.updatedAt.localeCompare(a.updatedAt));
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
  const idx = snapshot.findIndex((img) => (img.file?.id || "") === blobId);
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

export async function toggleChecklistItem(noteId: string, itemIndex: number): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const items = note.get("checklistItems");
  const snapshot = items.getSnapshot();
  if (itemIndex < 0 || itemIndex >= snapshot.length) throw new Error(`Checklist item index out of bounds: ${itemIndex}`);
  const item = items.get(itemIndex);
  item.set("done", !snapshot[itemIndex].done);
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function convertToChecklist(noteId: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const items = note.get("checklistItems");
  const existing = items.getSnapshot();
  if (existing.length > 0) return snapshotToNote(note.getSnapshot());
  const content = note.get("content");
  const lines = content.split("\n").filter((l: string) => l.trim().length > 0);
  note.set("content", lines.length > 0 ? lines[0] : "");
  for (const text of lines.slice(1)) {
    items.push({ text, done: false });
  }
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function convertToNote(noteId: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const items = note.get("checklistItems");
  const existing = items.getSnapshot();
  if (existing.length === 0) return snapshotToNote(note.getSnapshot());
  const content = note.get("content");
  const lines = content ? [content, ...existing.map((i: { text: string }) => i.text)] : existing.map((i: { text: string }) => i.text);
  note.set("content", lines.join("\n"));
  while (items.length > 0) {
    items.delete(items.length - 1);
  }
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function addChecklistItem(noteId: string, text: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const items = note.get("checklistItems");
  items.push({ text, done: false });
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function removeChecklistItem(noteId: string, itemIndex: number): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const items = note.get("checklistItems");
  const snapshot = items.getSnapshot();
  if (itemIndex < 0 || itemIndex >= snapshot.length) throw new Error(`Checklist item index out of bounds: ${itemIndex}`);
  items.delete(itemIndex);
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function editChecklistItem(noteId: string, itemIndex: number, newText: string): Promise<Note> {
  const client = await getClient();
  const note = await client.notes.get(noteId).resolved;
  if (!note) throw new Error(`Note not found: ${noteId}`);
  const items = note.get("checklistItems");
  const snapshot = items.getSnapshot();
  if (itemIndex < 0 || itemIndex >= snapshot.length) throw new Error(`Checklist item index out of bounds: ${itemIndex}`);
  const item = items.get(itemIndex);
  item.set("text", newText);
  note.set("updatedAt", new Date().toISOString());
  return snapshotToNote(note.getSnapshot());
}

export async function onDocChange(callback: () => void): Promise<() => void> {
  const client = await getClient();
  return client.subscribe("operation", callback);
}

/** Look up a Verdant file by ID across all notes and return its object URL. */
export async function getVerdantFileUrl(fileId: string): Promise<string | null> {
  if (!fileId) return null;
  const client = await getClient();
  const allNotes = await client.notes.findAll().resolved;
  for (const note of allNotes) {
    const images = note.get("images");
    for (let i = 0; i < images.length; i++) {
      const imgEntity = images.get(i);
      const file = imgEntity.get("file");
      if (file && file.id === fileId) {
        return file.url;
      }
    }
  }
  return null;
}
