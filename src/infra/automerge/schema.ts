import type { Note } from "../../domain/models/note.js";

export interface ScratchPadDoc {
  schemaVersion: number;
  notes: { [id: string]: Note };
}

export const CURRENT_SCHEMA_VERSION = 1;
