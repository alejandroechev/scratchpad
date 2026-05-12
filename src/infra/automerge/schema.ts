import type { Note } from "../../domain/models/note.js";

export interface ScratchPadDoc {
  schemaVersion: number;
  notes: { [id: string]: Note };
}

export const CURRENT_SCHEMA_VERSION = 5;

/** Migrate doc in-place from version 1→2: add images[], 2→3: add labels[], 3→4: add isTask/taskDone */
export function migrateDoc(doc: ScratchPadDoc): void {
  if (doc.schemaVersion < 2) {
    for (const note of Object.values(doc.notes)) {
      if (!note.images) {
        note.images = [];
      }
    }
    doc.schemaVersion = 2;
  }
  
  if (doc.schemaVersion < 3) {
    for (const note of Object.values(doc.notes)) {
      if (!note.labels) {
        note.labels = [];
      }
    }
    doc.schemaVersion = 3;
  }

  if (doc.schemaVersion < 4) {
    doc.schemaVersion = 4;
  }

  if (doc.schemaVersion < 5) {
    for (const note of Object.values(doc.notes)) {
      if (note.hideCompleted === undefined) {
        note.hideCompleted = false;
      }
    }
    doc.schemaVersion = 5;
  }
}
