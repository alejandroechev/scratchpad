import { Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import type { ScratchPadDoc } from "./schema.js";
import { CURRENT_SCHEMA_VERSION } from "./schema.js";
import { getAuthenticatedWsUrl } from "./auth.js";

const DOC_URL_KEY = "scratchpad-automerge-doc-url";
const IDB_NAME = "scratchpad-automerge";

const DEFAULT_DOC_URL = import.meta.env.VITE_AUTOMERGE_DOC_URL || "";
const DOC_READY_TIMEOUT_MS = 10_000;

let repoInstance: Repo | null = null;
let docHandleInstance: DocHandle<ScratchPadDoc> | null = null;

function createInitialDoc(): ScratchPadDoc {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    notes: {},
  };
}

export function getRepo(): Repo {
  if (!repoInstance) {
    const wsUrl = getAuthenticatedWsUrl();
    repoInstance = new Repo({
      network: [new BrowserWebSocketClientAdapter(wsUrl)],
      storage: new IndexedDBStorageAdapter(IDB_NAME),
    });
  }
  return repoInstance;
}

/** Wait for a doc handle to be ready, with a timeout */
async function waitForReady(handle: DocHandle<ScratchPadDoc>): Promise<boolean> {
  if (handle.doc()) return true;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), DOC_READY_TIMEOUT_MS);
    handle.whenReady().then(() => {
      clearTimeout(timer);
      resolve(true);
    }).catch(() => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

export async function getDocHandle(): Promise<DocHandle<ScratchPadDoc>> {
  if (docHandleInstance) return docHandleInstance;

  const repo = getRepo();
  // Hardcoded env var always wins — it's the shared doc for all devices
  const savedUrl = DEFAULT_DOC_URL || localStorage.getItem(DOC_URL_KEY);

  if (savedUrl) {
    const handle = await repo.find<ScratchPadDoc>(savedUrl as AutomergeUrl);
    const ready = await waitForReady(handle);
    if (ready && handle.doc()) {
      docHandleInstance = handle;
      localStorage.setItem(DOC_URL_KEY, savedUrl);
      return docHandleInstance!;
    }
    // Doc not found on server/storage — fall through to create new
    console.warn(`Could not load doc ${savedUrl}, creating a new one`);
  }

  docHandleInstance = repo.create<ScratchPadDoc>(createInitialDoc());
  localStorage.setItem(DOC_URL_KEY, docHandleInstance.url);
  return docHandleInstance;
}

/** Get the current doc URL (for display in SyncInfo) */
export function getDocUrl(): string {
  return localStorage.getItem(DOC_URL_KEY) || "";
}

export async function waitForDoc(): Promise<ScratchPadDoc> {
  const handle = await getDocHandle();
  const doc = handle.doc();
  if (!doc) throw new Error("Failed to load Automerge document");
  return doc;
}
