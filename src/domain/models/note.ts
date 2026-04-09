export interface Note {
  id: string;
  content: string;
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
    createdAt: now,
    updatedAt: now,
    archived: false,
  };
}
