/**
 * Worker Client — main-thread proxy to the Automerge Web Worker.
 * Exposes the same API as note-store.ts but all operations execute in the worker.
 * No Automerge WASM runs on the main thread.
 */

import type { Note, NoteImage } from "../../domain/models/note.js";
import type { NoteFilters } from "../../domain/services/note-repository.js";
import { getAuthenticatedWsUrl } from "./auth.js";
import { getActiveProfile } from "../profile-store.js";

const RPC_TIMEOUT_MS = 10_000;

let worker: Worker | null = null;
let nextId = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC pending map holds callbacks for heterogeneous return types
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
let changeListeners: Array<() => void> = [];
let initPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;

    if (msg.type === "change") {
      for (const cb of changeListeners) cb();
      return;
    }

    if (msg.type === "init-done") {
      if (msg.docUrl) {
        localStorage.setItem("scratchpad-automerge-doc-url", msg.docUrl);
      }
      return;
    }

    if (msg.type === "init-error") {
      console.error("[worker-client] Init error:", msg.error);
      return;
    }

    // RPC response
    const { id, result, error } = msg;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    clearTimeout(p.timer);
    if (error) {
      p.reject(new Error(error));
    } else {
      p.resolve(result);
    }
  };

  worker.onerror = (e) => {
    console.error("[worker-client] Worker error:", e);
    for (const [, p] of pending) {
      clearTimeout(p.timer);
      p.reject(new Error("Worker crashed"));
    }
    pending.clear();
  };

  return worker;
}

function ensureInit(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve) => {
    const w = getWorker();

    const wsUrl = getAuthenticatedWsUrl();
    const profile = getActiveProfile();
    const docUrl = profile?.docUrl ||
      import.meta.env.VITE_AUTOMERGE_DOC_URL ||
      localStorage.getItem("scratchpad-automerge-doc-url") || "";

    const timeout = setTimeout(() => {
      console.warn("[worker-client] Init timeout — proceeding anyway");
      resolve();
    }, 30_000);

    const handler = (e: MessageEvent) => {
      if (e.data.type === "ready") {
        w.postMessage({ type: "init", config: { wsUrl, docUrl } });
        return;
      }
      if (e.data.type === "init-done" || e.data.type === "init-error") {
        clearTimeout(timeout);
        w.removeEventListener("message", handler);
        resolve();
      }
    };
    w.addEventListener("message", handler);
  });

  return initPromise;
}

function call<T>(method: string, ...args: unknown[]): Promise<T> {
  return ensureInit().then(() => {
    return new Promise<T>((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, RPC_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      getWorker().postMessage({ id, method, args });
    });
  });
}

// ============= Exported API (mirrors note-store.ts) =============

export const createNoteAsync = (content: string) => call<Note>("createNoteAsync", content);
export const getNoteById = (id: string) => call<Note | null>("getNoteById", id);
export const listNotes = (filters?: NoteFilters) => call<Note[]>("listNotes", filters);
export const updateNote = (id: string, content: string) => call<Note>("updateNote", id, content);
export const archiveNote = (id: string) => call<Note>("archiveNote", id);
export const unarchiveNote = (id: string) => call<Note>("unarchiveNote", id);
export const deleteNote = (id: string) => call<void>("deleteNote", id);
export const addImage = (noteId: string, image: NoteImage) => call<Note>("addImage", noteId, image);
export const removeImage = (noteId: string, blobId: string) => call<Note>("removeImage", noteId, blobId);
export const addLabel = (noteId: string, label: string) => call<Note>("addLabel", noteId, label);
export const removeLabel = (noteId: string, label: string) => call<Note>("removeLabel", noteId, label);
export const mergeNotes= (targetId: string, sourceIds: string[]) => call<Note>("mergeNotes", targetId, sourceIds);

// --- Doc change subscription ---
export function onDocChange(callback: () => void): () => void {
  changeListeners.push(callback);
  ensureInit();
  return () => {
    changeListeners = changeListeners.filter((cb) => cb !== callback);
  };
}

// --- Utility ---
export const getDocUrl = () => call<string>("getDocUrl");
