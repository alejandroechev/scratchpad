import type { Note } from "../../domain/models/note.js";

export interface ScratchPadDoc {
  schemaVersion: number;
  notes: { [id: string]: Note };
}

export const CURRENT_SCHEMA_VERSION = 2;

/** Migrate doc in-place from version 1→2: add images[] to each note */
export function migrateDoc(doc: ScratchPadDoc): void {
  if (doc.schemaVersion < 2) {
    for (const note of Object.values(doc.notes)) {
      if (!note.images) {
        note.images = [];
      }
    }
    doc.schemaVersion = 2;
  }
}
