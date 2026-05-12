import type { Note, NoteImage } from "../models/note.js";

export interface NoteFilters {
  includeArchived?: boolean;
  search?: string;
  label?: string;
}

export interface NoteRepository {
  create(content: string): Note;
  getById(id: string): Note | null;
  list(filters?: NoteFilters): Note[];
  update(id: string, content: string): Note;
  archive(id: string): Note;
  unarchive(id: string): Note;
  delete(id: string): void;
  addImage(noteId: string, image: NoteImage): Note;
  removeImage(noteId: string, blobId: string): Note;
  addLabel(noteId: string, label: string): Note;
  removeLabel(noteId: string, label: string): Note;
  mergeNotes(targetId: string, sourceIds: string[]): Note;
  toggleChecklistItem(noteId: string, itemIndex: number): Note;
  convertToChecklist(noteId: string): Note;
  convertToNote(id: string): Note;
  addChecklistItem(noteId: string, text: string): Note;
  removeChecklistItem(noteId: string, itemIndex: number): Note;
  editChecklistItem(noteId: string, itemIndex: number, newText: string): Note;
  setHideCompleted(noteId: string, hide: boolean): Note;
}
