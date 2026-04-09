import type { Note } from "../../domain/models/note.js";
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

    // Newest first
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

  delete(id: string): void {
    if (!this.notes.has(id)) throw new Error(`Note not found: ${id}`);
    this.notes.delete(id);
  }
}
