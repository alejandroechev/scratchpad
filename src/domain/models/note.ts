export interface NoteImage {
  blobId: string;      // SHA-256 hex
  fileName: string;    // original filename
  sizeBytes: number;
  createdAt: string;
}

export interface Note {
  id: string;
  content: string;
  images?: NoteImage[];
  labels?: string[];
  isTask?: boolean;
  taskDone?: boolean;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface CreateNoteInput {
  content: string;
}

export interface UpdateNoteInput {
  content: string;
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

export function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_REGEX)].map((m) => m[0]);
}

export function createNote(id: string, content: string): Note {
  const now = new Date().toISOString();
  return {
    id,
    content,
    images: [],
    labels: [],
    isTask: false,
    taskDone: false,
    createdAt: now,
    updatedAt: now,
    archived: false,
  };
}
