import type { Note } from "../models/note.js";

export interface NoteFilters {
  includeArchived?: boolean;
  search?: string;
}

export interface NoteRepository {
  create(content: string): Note;
  getById(id: string): Note | null;
  list(filters?: NoteFilters): Note[];
  update(id: string, content: string): Note;
  archive(id: string): Note;
  delete(id: string): void;
}
