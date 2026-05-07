/**
 * Automerge Web Worker — owns the CRDT Repo, IDB storage, and WebSocket sync.
 * All Automerge WASM processing happens here, off the main thread.
 *
 * Communication protocol:
 *   Main → Worker: { id: number, method: string, args: any[] }
 *   Worker → Main: { id: number, result?: any, error?: string }
 *   Worker → Main: { type: "change" }   (doc changed notification)
 *   Main → Worker: { type: "init", config: WorkerConfig }
 */

self.onerror = (event) => {
  self.postMessage({ type: "init-error", error: `Worker error: ${event}` });
};
self.onunhandledrejection = (event: PromiseRejectionEvent) => {
  self.postMessage({ type: "init-error", error: `Unhandled rejection: ${event.reason}` });
};

import { Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import type { AutomergeUrl, DocHandle, NetworkAdapterInterface } from "@automerge/automerge-repo";
import type { ScratchPadDoc } from "./schema.js";
import type { Note, NoteImage } from "../../domain/models/note.js";
import { createNote } from "../../domain/models/note.js";
import { CURRENT_SCHEMA_VERSION, migrateDoc } from "./schema.js";

const IDB_NAME = "scratchpad-automerge";
const DOC_READY_TIMEOUT_MS = 10_000;

let repo: Repo | null = null;
let handle: DocHandle<ScratchPadDoc> | null = null;
let initDone = false;
let pendingMessages: MessageEvent[] = [];

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

interface WorkerConfig {
  wsUrl: string;
  docUrl: string;
}

async function init(config: WorkerConfig): Promise<void> {
  const idbAdapter = new IndexedDBStorageAdapter(IDB_NAME);
  repo = new Repo({ storage: idbAdapter });

  if (config.docUrl) {
    handle = await repo.find<ScratchPadDoc>(config.docUrl as AutomergeUrl);

    if (!handle.doc()) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, DOC_READY_TIMEOUT_MS);
        handle!.whenReady().then(() => { clearTimeout(timer); resolve(); })
          .catch(() => { clearTimeout(timer); resolve(); });
      });
    }

    const doc = handle.doc();
    if (doc && doc.schemaVersion < CURRENT_SCHEMA_VERSION) {
      handle.change((d) => migrateDoc(d));
    }
  } else {
    handle = repo.create<ScratchPadDoc>({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      notes: {},
    });
  }

  handle!.on("change", () => {
    self.postMessage({ type: "change" });
  });

  self.postMessage({ type: "init-done", docUrl: handle!.url });

  initDone = true;
  for (const queued of pendingMessages) {
    handleRpc(queued.data);
  }
  pendingMessages = [];

  self.postMessage({ type: "change" });

  // Add WebSocket AFTER doc is loaded so sync doesn't block startup
  if (config.wsUrl) {
    setTimeout(() => {
      if (!repo) return;
      try {
        const wsAdapter = new BrowserWebSocketClientAdapter(config.wsUrl);
        repo.networkSubsystem.addNetworkAdapter(wsAdapter as NetworkAdapterInterface);
      } catch (err) {
        console.error("WebSocket failed:", (err as Error).message);
      }
    }, 2000);
  }
}

function getDoc(): ScratchPadDoc | undefined {
  return handle?.doc();
}

// ============= RPC Handlers =============

const handlers: Record<string, (...args: any[]) => any> = {
  createNoteAsync(content: string): Note {
    const note = createNote(generateId(), content);
    handle!.change((doc) => { doc.notes[note.id] = note; });
    return toPlain(handle!.doc()!.notes[note.id]);
  },

  getNoteById(id: string): Note | null {
    return toPlain(getDoc()?.notes[id] ?? null);
  },

  listNotes(filters?: { includeArchived?: boolean; search?: string; label?: string; tasksOnly?: boolean }): Note[] {
    const doc = getDoc();
    if (!doc) return [];
    let results = Object.values(doc.notes);
    if (!filters?.includeArchived) results = results.filter((n) => !n.archived);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter((n) => n.content.toLowerCase().includes(q));
    }
    if (filters?.label) results = results.filter((n) => n.labels?.includes(filters.label!));
    if (filters?.tasksOnly) results = results.filter((n) => n.isTask === true);
    results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return toPlain(results);
  },

  updateNote(id: string, content: string): Note {
    handle!.change((doc) => {
      const note = doc.notes[id];
      if (!note) throw new Error(`Note not found: ${id}`);
      note.content = content;
      note.updatedAt = new Date().toISOString();
    });
    return toPlain(handle!.doc()!.notes[id]);
  },

  archiveNote(id: string): Note {
    handle!.change((doc) => {
      const note = doc.notes[id];
      if (!note) throw new Error(`Note not found: ${id}`);
      note.archived = true;
      note.updatedAt = new Date().toISOString();
    });
    return toPlain(handle!.doc()!.notes[id]);
  },

  unarchiveNote(id: string): Note {
    handle!.change((doc) => {
      const note = doc.notes[id];
      if (!note) throw new Error(`Note not found: ${id}`);
      note.archived = false;
      note.updatedAt = new Date().toISOString();
    });
    return toPlain(handle!.doc()!.notes[id]);
  },

  deleteNote(id: string): void {
    handle!.change((doc) => {
      if (!doc.notes[id]) throw new Error(`Note not found: ${id}`);
      delete doc.notes[id];
    });
  },

  addImage(noteId: string, image: NoteImage): Note {
    handle!.change((doc) => {
      const note = doc.notes[noteId];
      if (!note) throw new Error(`Note not found: ${noteId}`);
      if (!note.images) note.images = [];
      note.images.push(image);
      note.updatedAt = new Date().toISOString();
    });
    return toPlain(handle!.doc()!.notes[noteId]);
  },

  removeImage(noteId: string, blobId: string): Note {
    handle!.change((doc) => {
      const note = doc.notes[noteId];
      if (!note) throw new Error(`Note not found: ${noteId}`);
      if (!note.images) note.images = [];
      const idx = note.images.findIndex((img) => img.blobId === blobId);
      if (idx === -1) throw new Error(`Image not found: ${blobId}`);
      note.images.splice(idx, 1);
      note.updatedAt = new Date().toISOString();
    });
    return toPlain(handle!.doc()!.notes[noteId]);
  },

  addLabel(noteId: string, label: string): Note {
    handle!.change((doc) => {
      const note = doc.notes[noteId];
      if (!note) throw new Error(`Note not found: ${noteId}`);
      if (!note.labels) note.labels = [];
      if (!note.labels.includes(label)) {
        note.labels.push(label);
        note.updatedAt = new Date().toISOString();
      }
    });
    return toPlain(handle!.doc()!.notes[noteId]);
  },

  removeLabel(noteId: string, label: string): Note {
    handle!.change((doc) => {
      const note = doc.notes[noteId];
      if (!note) throw new Error(`Note not found: ${noteId}`);
      if (!note.labels) note.labels = [];
      const initialLength = note.labels.length;
      note.labels = note.labels.filter((l) => l !== label);
      if (note.labels.length !== initialLength) note.updatedAt = new Date().toISOString();
    });
    return toPlain(handle!.doc()!.notes[noteId]);
  },

  toggleTask(id: string): Note {
    handle!.change((doc) => {
      const note = doc.notes[id];
      if (!note) throw new Error(`Note not found: ${id}`);
      note.isTask = !note.isTask;
      if (!note.isTask) note.taskDone = false;
      note.updatedAt = new Date().toISOString();
    });
    return toPlain(handle!.doc()!.notes[id]);
  },

  toggleTaskDone(id: string): Note {
    handle!.change((doc) => {
      const note = doc.notes[id];
      if (!note) throw new Error(`Note not found: ${id}`);
      note.taskDone = !note.taskDone;
      note.updatedAt = new Date().toISOString();
    });
    return toPlain(handle!.doc()!.notes[id]);
  },

  mergeNotes(targetId: string, sourceIds: string[]): Note {
    handle!.change((doc) => {
      const target = doc.notes[targetId];
      if (!target) throw new Error(`Note not found: ${targetId}`);
      const sources = sourceIds
        .map((id) => {
          const note = doc.notes[id];
          if (!note) throw new Error(`Note not found: ${id}`);
          return { id, note };
        })
        .sort((a, b) => b.note.updatedAt.localeCompare(a.note.updatedAt));
      for (const { id, note: source } of sources) {
        if (source.content) {
          target.content = target.content ? target.content + "\n---\n" + source.content : source.content;
        }
        if (source.images?.length) {
          if (!target.images) target.images = [];
          for (const img of source.images) target.images.push(img);
        }
        if (source.labels?.length) {
          if (!target.labels) target.labels = [];
          const existing = new Set(target.labels);
          for (const label of source.labels) {
            if (!existing.has(label)) { target.labels.push(label); existing.add(label); }
          }
        }
        doc.notes[id].archived = true;
        doc.notes[id].updatedAt = new Date().toISOString();
      }
      target.updatedAt = new Date().toISOString();
    });
    return toPlain(handle!.doc()!.notes[targetId]);
  },

  getDocUrl(): string {
    return handle?.url ?? "";
  },
};

// ============= Message Handler =============

function handleRpc(msg: any): void {
  const { id, method, args } = msg;
  if (!handlers[method]) {
    self.postMessage({ id, error: `Unknown method: ${method}` });
    return;
  }
  try {
    const result = handlers[method](...(args || []));
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: (err as Error).message });
  }
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === "init") {
    try {
      await init(msg.config as WorkerConfig);
    } catch (err) {
      self.postMessage({ type: "init-error", error: (err as Error).message });
    }
    return;
  }
  if (!initDone) {
    pendingMessages.push(e);
    return;
  }
  handleRpc(msg);
};

self.postMessage({ type: "ready" });
