/** Generated types for Verdant client */
import type {
  Client as BaseClient,
  ClientInitOptions as BaseClientInitOptions,
  CollectionQueries,
  StorageSchema,
  Migration,
} from "@verdant-web/store";
export * from "@verdant-web/store";

export class Client<Presence = any, Profile = any> {
  /** Collection access for Note. Load queries, put and delete documents. */
  readonly notes: CollectionQueries<Note, NoteInit, NoteFilter>;

  /**
   * Turn on and off sync, or adjust the sync protocol and other settings.
   */
  sync: BaseClient<Presence, Profile>["sync"];
  /**
   * Access and manipulate the undo/redo stack. You can also
   * add custom undoable actions using addUndo, although the interface
   * for doing this is pretty mind-bending at the moment (sorry).
   */
  undoHistory: BaseClient<Presence, Profile>["undoHistory"];
  /**
   * The namespace used to construct this store.
   */
  namespace: BaseClient<Presence, Profile>["namespace"];
  /**
   * @deprecated - do not use this. For batching, use .batch instead.
   * Using methods on this property can cause data loss and corruption.
   */
  entities: BaseClient<Presence, Profile>["entities"];
  /**
   * Tools for batching operations so they are bundled together
   * in the undo/redo stack.
   */
  batch: BaseClient<Presence, Profile>["batch"];
  close: BaseClient<Presence, Profile>["close"];
  /**
   * Export a backup of a full library
   */
  export: BaseClient<Presence, Profile>["export"];
  /**
   * Import a full library from a backup. WARNING: this replaces
   * existing data with no option for restore.
   */
  import: BaseClient<Presence, Profile>["import"];
  /**
   * Subscribe to global store events
   */
  subscribe: BaseClient<Presence, Profile>["subscribe"];
  /**
   * Read stats about storage usage
   */
  stats: BaseClient<Presence, Profile>["stats"];
  /**
   * An interface for inspecting and manipulating active live queries.
   * Particularly, see .keepAlive and .dropKeepAlive for placing keep-alive
   * holds to keep query results in memory when unsubscribed.
   */
  queries: BaseClient<Presence, Profile>["queries"];

  /**
   * Get the local replica ID for this client instance.
   * Not generally useful for people besides me.
   */
  getReplicaId: BaseClient<Presence, Profile>["getReplicaId"];

  /**
   * Deletes all local data. If the client is connected to sync,
   * this will cause the client to re-sync all data from the server.
   * Use this very carefully, and only as a last resort.
   */
  __dangerous__resetLocal: BaseClient<
    Presence,
    Profile
  >["__dangerous__resetLocal"];

  /**
   * Export all data, then re-import it. This might resolve
   * some issues with the local database, but it should
   * only be done as a second-to-last resort. The last resort
   * would be __dangerous__resetLocal on Client, which
   * clears all local data.
   *
   * Unlike __dangerous__resetLocal, this method allows local-only
   * clients to recover data, whereas __dangerous__resetLocal only
   * lets networked clients recover from the server.
   */
  __dangerous__hardReset: () => Promise<void>;

  /**
   * Manually triggers storage rebasing. Follows normal
   * rebasing rules. Rebases already happen automatically
   * during normal operation, so you probably don't need this.
   */
  __manualRebase: () => Promise<void>;

  constructor(init: ClientInitOptions<Presence, Profile>);
}

export interface ClientInitOptions<Presence = any, Profile = any> extends Omit<
  BaseClientInitOptions<Presence, Profile>,
  "schema" | "migrations" | "oldSchemas"
> {
  /** WARNING: overriding the schema is dangerous and almost definitely not what you want. */
  schema?: StorageSchema;
  /** WARNING: overriding old schemas is dangerous and almost definitely not what you want. */
  oldSchemas?: StorageSchema[];
  /** WARNING: overriding the migrations is dangerous and almost definitely not what you want. */
  migrations?: Migration[];
}

import {
  ObjectEntity,
  ListEntity,
  EntityFile,
  EntityFileSnapshot,
} from "@verdant-web/store";

/** Generated types for Note */

export type Note = ObjectEntity<NoteInit, NoteDestructured, NoteSnapshot>;
export type NoteId = string;
export type NoteContent = string;
export type NoteImages = ListEntity<
  NoteImagesInit,
  NoteImagesDestructured,
  NoteImagesSnapshot
>;
export type NoteImagesItem = ObjectEntity<
  NoteImagesItemInit,
  NoteImagesItemDestructured,
  NoteImagesItemSnapshot
>;
export type NoteImagesItemFile = EntityFile;
export type NoteImagesItemFileName = string;
export type NoteImagesItemSizeBytes = number;
export type NoteImagesItemCreatedAt = string;
export type NoteLabels = ListEntity<
  NoteLabelsInit,
  NoteLabelsDestructured,
  NoteLabelsSnapshot
>;
export type NoteLabelsItem = string;
export type NoteIsTask = boolean;
export type NoteTaskDone = boolean;
export type NoteCreatedAt = string;
export type NoteUpdatedAt = string;
export type NoteArchived = boolean;
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
export type NoteDestructured = {
  id: string;
  content: string;
  images: NoteImages;
  labels: NoteLabels;
  isTask: boolean;
  taskDone: boolean;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};

export type NoteImagesItemDestructured = {
  file: EntityFile | null;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
};
export type NoteImagesDestructured = NoteImagesItem[];
export type NoteLabelsDestructured = string[];
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

/** Index filters for Note **/

export interface NoteArchivedSortFilter {
  where: "archived";
  order: "asc" | "desc";
}
export interface NoteArchivedMatchFilter {
  where: "archived";
  equals: boolean;
  order?: "asc" | "desc";
}
export interface NoteArchivedRangeFilter {
  where: "archived";
  gte?: boolean;
  gt?: boolean;
  lte?: boolean;
  lt?: boolean;
  order?: "asc" | "desc";
}
export interface NoteIsTaskSortFilter {
  where: "isTask";
  order: "asc" | "desc";
}
export interface NoteIsTaskMatchFilter {
  where: "isTask";
  equals: boolean;
  order?: "asc" | "desc";
}
export interface NoteIsTaskRangeFilter {
  where: "isTask";
  gte?: boolean;
  gt?: boolean;
  lte?: boolean;
  lt?: boolean;
  order?: "asc" | "desc";
}
export interface NoteUpdatedAtSortFilter {
  where: "updatedAt";
  order: "asc" | "desc";
}
export interface NoteUpdatedAtMatchFilter {
  where: "updatedAt";
  equals: string;
  order?: "asc" | "desc";
}
export interface NoteUpdatedAtRangeFilter {
  where: "updatedAt";
  gte?: string;
  gt?: string;
  lte?: string;
  lt?: string;
  order?: "asc" | "desc";
}
export interface NoteUpdatedAtStartsWithFilter {
  where: "updatedAt";
  startsWith: string;
  order?: "asc" | "desc";
}
export interface NoteArchivedByUpdatedAtCompoundFilter {
  where: "archivedByUpdatedAt";
  match: {
    archived: boolean;
    updatedAt?: string;
  };
  order?: "asc" | "desc";
}
export type NoteFilter =
  | NoteArchivedSortFilter
  | NoteArchivedMatchFilter
  | NoteArchivedRangeFilter
  | NoteIsTaskSortFilter
  | NoteIsTaskMatchFilter
  | NoteIsTaskRangeFilter
  | NoteUpdatedAtSortFilter
  | NoteUpdatedAtMatchFilter
  | NoteUpdatedAtRangeFilter
  | NoteUpdatedAtStartsWithFilter
  | NoteArchivedByUpdatedAtCompoundFilter;
