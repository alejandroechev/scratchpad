import type { Note } from "../../domain/models/note.js";

export interface ScratchPadDoc {
  schemaVersion: number;
  notes: { [id: string]: Note };
}

export const CURRENT_SCHEMA_VERSION = 4;

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
    for (const note of Object.values(doc.notes)) {
      if (note.isTask === undefined) note.isTask = false;
      if (note.taskDone === undefined) note.taskDone = false;
    }
    doc.schemaVersion = 4;
  }
}
