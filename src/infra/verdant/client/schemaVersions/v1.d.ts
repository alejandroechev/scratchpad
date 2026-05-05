import { StorageSchema } from "@verdant-web/common";
declare const schema: StorageSchema;
export default schema;

export type NoteSnapshot = {
  id: string;
  content: string;
  images: NoteImagesSnapshot;
  labels: NoteLabelsSnapshot;
  isTask: boolean;
  taskDone: boolean;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};

export type NoteImagesItemSnapshot = {
  file: EntityFileSnapshot | null;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
};
export type NoteImagesSnapshot = NoteImagesItemSnapshot[];
export type NoteLabelsSnapshot = string[];
export type NoteInit = {
  id?: string;
  content?: string;
  images?: NoteImagesInit;
  labels?: NoteLabelsInit;
  isTask?: boolean;
  taskDone?: boolean;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
};

export type NoteImagesItemInit = {
  file?: File | null;
  fileName?: string;
  sizeBytes?: number;
  createdAt?: string;
};
export type NoteImagesInit = NoteImagesItemInit[];
export type NoteLabelsInit = string[];

export type MigrationTypes = {
  notes: { init: NoteInit; snapshot: NoteSnapshot };
};
