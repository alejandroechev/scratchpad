import { Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import type { ScratchPadDoc } from "./schema.js";
import { CURRENT_SCHEMA_VERSION } from "./schema.js";

const DOC_URL_KEY = "scratchpad-automerge-doc-url";
const IDB_NAME = "scratchpad-automerge";

const SYNC_SERVER_URL = import.meta.env.VITE_SYNC_SERVER_URL || "ws://localhost:3030";
const DEFAULT_DOC_URL = import.meta.env.VITE_AUTOMERGE_DOC_URL || "";

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
    repoInstance = new Repo({
      network: [new BrowserWebSocketClientAdapter(SYNC_SERVER_URL)],
      storage: new IndexedDBStorageAdapter(IDB_NAME),
    });
  }
  return repoInstance;
}

export async function getDocHandle(): Promise<DocHandle<ScratchPadDoc>> {
  if (docHandleInstance) return docHandleInstance;

  const repo = getRepo();
  const savedUrl = localStorage.getItem(DOC_URL_KEY) || DEFAULT_DOC_URL;

  if (savedUrl) {
    docHandleInstance = await repo.find<ScratchPadDoc>(savedUrl as AutomergeUrl);
    localStorage.setItem(DOC_URL_KEY, savedUrl);
  } else {
    docHandleInstance = repo.create<ScratchPadDoc>(createInitialDoc());
    localStorage.setItem(DOC_URL_KEY, docHandleInstance.url);
  }

  return docHandleInstance;
}

export async function waitForDoc(): Promise<ScratchPadDoc> {
  const handle = await getDocHandle();
  const doc = handle.doc();
  if (!doc) throw new Error("Failed to load Automerge document");
  return doc;
}
