import type { Note, NoteImage } from "../../domain/models/note.js";
import type { NoteRepository, NoteFilters } from "../../domain/services/note-repository.js";
import { createNote } from "../../domain/models/note.js";

let counter = 0;
function generateId(): string {
  counter++;
  return `note-${Date.now()}-${counter}`;
}

export class InMemoryNoteStore implements NoteRepository {
  private notes = new Map<string, Note>();

  create(content: string): Note {
    const note = createNote(generateId(), content);
    this.notes.set(note.id, note);
    return { ...note };
  }

  getById(id: string): Note | null {
    const note = this.notes.get(id);
    return note ? { ...note } : null;
  }

  list(filters?: NoteFilters): Note[] {
    let results = Array.from(this.notes.values());

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

    // Most recently updated first
    results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return results.map((n) => ({ ...n }));
  }

  update(id: string, content: string): Note {
    const note = this.notes.get(id);
    if (!note) throw new Error(`Note not found: ${id}`);
    note.content = content;
    note.updatedAt = new Date().toISOString();
    return { ...note };
  }

  archive(id: string): Note {
    const note = this.notes.get(id);
    if (!note) throw new Error(`Note not found: ${id}`);
    note.archived = true;
    note.updatedAt = new Date().toISOString();
    return { ...note };
  }

  unarchive(id: string): Note {
    const note = this.notes.get(id);
    if (!note) throw new Error(`Note not found: ${id}`);
    note.archived = false;
    note.updatedAt = new Date().toISOString();
    return { ...note };
  }

  delete(id: string): void {
    if (!this.notes.has(id)) throw new Error(`Note not found: ${id}`);
    this.notes.delete(id);
  }

  addImage(noteId: string, image: NoteImage): Note {
    const note = this.notes.get(noteId);
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (!note.images) note.images = [];
    note.images.push(image);
    note.updatedAt = new Date().toISOString();
    return { ...note, images: [...note.images] };
  }

  removeImage(noteId: string, blobId: string): Note {
    const note = this.notes.get(noteId);
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (!note.images) note.images = [];
    const idx = note.images.findIndex((img) => img.blobId === blobId);
    if (idx === -1) throw new Error(`Image not found: ${blobId}`);
    note.images.splice(idx, 1);
    note.updatedAt = new Date().toISOString();
    return { ...note, images: [...note.images] };
  }

  addLabel(noteId: string, label: string): Note {
    const note = this.notes.get(noteId);
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (!note.labels) note.labels = [];
    if (!note.labels.includes(label)) {
      note.labels.push(label);
      note.updatedAt = new Date().toISOString();
    }
    return { ...note, labels: [...note.labels] };
  }

  removeLabel(noteId: string, label: string): Note {
    const note = this.notes.get(noteId);
    if (!note) throw new Error(`Note not found: ${noteId}`);
    if (!note.labels) note.labels = [];
    const initialLength = note.labels.length;
    note.labels = note.labels.filter(l => l !== label);
    if (note.labels.length !== initialLength) {
      note.updatedAt = new Date().toISOString();
    }
    return { ...note, labels: [...note.labels] };
  }
}
