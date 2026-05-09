import type { Note, NoteImage } from "../../domain/models/note.js";
import type { NoteFilters } from "../../domain/services/note-repository.js";
import { createNote } from "../../domain/models/note.js";
import { getDocHandle } from "./repo.js";

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createNoteAsync(content: string): Promise<Note> {
  const handle = await getDocHandle();
  const note = createNote(generateId(), content);
  handle.change((doc) => {
    doc.notes[note.id] = note;
  });
  return note;
}

export async function getNoteById(id: string): Promise<Note | null> {
  const handle = await getDocHandle();
  const doc = handle.doc();
  if (!doc) return null;
  return doc.notes[id] ?? null;
}

export async function listNotes(filters?: NoteFilters): Promise<Note[]> {
  const handle = await getDocHandle();
  const doc = handle.doc();
  if (!doc) return [];

  let results = Object.values(doc.notes);

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

  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return results;
}

export async function updateNote(id: string, content: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[id];
    if (!note) throw new Error(`Note not found: ${id}`);
    note.content = content;
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[id];
}

export async function archiveNote(id: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[id];
    if (!note) throw new Error(`Note not found: ${id}`);
    note.archived = true;
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[id];
}

export async function unarchiveNote(id: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[id];
    if (!note) throw new Error(`Note not found: ${id}`);
    note.archived = false;
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[id];
}

export async function deleteNote(id: string): Promise<void> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    if (!doc.notes[id]) throw new Error(`Note not found: ${id}`);
    delete doc.notes[id];
  });
}

export async function addImage(noteId: string, image: NoteImage): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (!note.images) note.images = [];
    note.images.push(image);
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function removeImage(noteId: string, blobId: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (!note.images) note.images = [];
    const idx = note.images.findIndex((img) => img.blobId === blobId);
    if (idx === -1) throw new Error(`Image not found: ${blobId}`);
    note.images.splice(idx, 1);
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function addLabel(noteId: string, label: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (!note.labels) note.labels = [];
    if (!note.labels.includes(label)) {
      note.labels.push(label);
      note.updatedAt = new Date().toISOString();
    }
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function removeLabel(noteId: string, label: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (!note.labels) note.labels = [];
    const initialLength = note.labels.length;
    note.labels = note.labels.filter(l => l !== label);
    if (note.labels.length !== initialLength) {
      note.updatedAt = new Date().toISOString();
    }
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function toggleChecklistItem(noteId: string, itemIndex: number): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    const items = note.checklistItems ?? [];
    if (itemIndex < 0 || itemIndex >= items.length) throw new Error(`Checklist item index out of bounds: ${itemIndex}`);
    items[itemIndex].done = !items[itemIndex].done;
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function convertToChecklist(noteId: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (note.checklistItems && note.checklistItems.length > 0) return;
    const lines = note.content.split("\n").filter((l) => l.trim().length > 0);
    note.content = lines.length > 0 ? lines[0] : "";
    note.checklistItems = lines.slice(1).map((text) => ({ text, done: false }));
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function convertToNote(noteId: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    const items = note.checklistItems ?? [];
    if (items.length === 0) return;
    const lines = note.content ? [note.content, ...items.map((i) => i.text)] : items.map((i) => i.text);
    note.content = lines.join("\n");
    note.checklistItems = [];
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function addChecklistItem(noteId: string, text: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (!note.checklistItems) note.checklistItems = [];
    note.checklistItems.push({ text, done: false });
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function removeChecklistItem(noteId: string, itemIndex: number): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    const items = note.checklistItems ?? [];
    if (itemIndex < 0 || itemIndex >= items.length) throw new Error(`Checklist item index out of bounds: ${itemIndex}`);
    items.splice(itemIndex, 1);
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function editChecklistItem(noteId: string, itemIndex: number, newText: string): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const note = doc.notes[noteId];
    if (!note) throw new Error(`Note not found: ${noteId}`);
    const items = note.checklistItems ?? [];
    if (itemIndex < 0 || itemIndex >= items.length) throw new Error(`Checklist item index out of bounds: ${itemIndex}`);
    items[itemIndex].text = newText;
    note.updatedAt = new Date().toISOString();
  });
  const doc = handle.doc()!;
  return doc.notes[noteId];
}

export async function mergeNotes(targetId: string, sourceIds: string[]): Promise<Note> {
  const handle = await getDocHandle();
  handle.change((doc) => {
    const target = doc.notes[targetId];
    if (!target) throw new Error(`Note not found: ${targetId}`);

    const sources = sourceIds
      .map((id) => {
        const note = doc.notes[id];
        if (!note) throw new Error(`Note not found: ${id}`);
        return { id, note };
      })
      .sort((a, b) => b.note.updatedAt.localeCompare(a.note.updatedAt));

    for (const { id, note: source } of sources) {
      if (source.content) {
        target.content = target.content
          ? target.content + "\n---\n" + source.content
          : source.content;
      }
      if (source.images?.length) {
        if (!target.images) target.images = [];
        for (const img of source.images) target.images.push(img);
      }
      if (source.labels?.length) {
        if (!target.labels) target.labels = [];
        const existing = new Set(target.labels);
        for (const label of source.labels) {
          if (!existing.has(label)) {
            target.labels.push(label);
            existing.add(label);
          }
        }
      }
      if (source.checklistItems?.length) {
        if (!target.checklistItems) target.checklistItems = [];
        for (const item of source.checklistItems) {
          target.checklistItems.push({ text: item.text, done: item.done });
        }
      }
      doc.notes[id].archived = true;
      doc.notes[id].updatedAt = new Date().toISOString();
    }

    target.updatedAt = new Date().toISOString();
  });
  return handle.doc()!.notes[targetId];
}
