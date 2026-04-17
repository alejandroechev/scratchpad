/**
 * Blob sync retry queue.
 * Stores files locally in IndexedDB and syncs to the sync server via HTTP.
 * Retries failed uploads on reconnect.
 */

import { getAuthHeaders } from "./auth.js";

const BLOB_SERVER_URL = (import.meta.env.VITE_SYNC_SERVER_URL || "ws://localhost:3030")
  .replace(/^ws/, "http") + "/blobs";

const BLOB_DB_NAME = "scratchpad-blobs";
const BLOB_STORE = "blobs";
const PENDING_STORE = "pending-uploads";
const METADATA_STORE = "blob-metadata";
const DB_VERSION = 2;

function openBlobDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BLOB_DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE);
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeLocalBlob(blobId: string, data: ArrayBuffer, mimeType?: string): Promise<void> {
  const db = await openBlobDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, METADATA_STORE], "readwrite");
    tx.objectStore(BLOB_STORE).put(data, blobId);
    if (mimeType) {
      tx.objectStore(METADATA_STORE).put({ mimeType }, blobId);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalBlob(blobId: string): Promise<ArrayBuffer | null> {
  const db = await openBlobDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const request = tx.objectStore(BLOB_STORE).get(blobId);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function getBlobMetadata(blobId: string): Promise<{ mimeType?: string } | null> {
  const db = await openBlobDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(METADATA_STORE, "readonly");
    const request = tx.objectStore(METADATA_STORE).get(blobId);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

function detectMimeType(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  if (bytes.length < 4) return "image/png";
  
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return "image/png";
  }
  
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return "image/jpeg";
  }
  
  // GIF: 47 49 46
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  
  // WEBP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return "image/webp";
    }
  }
  
  return "image/png";
}

async function addToPendingQueue(blobId: string): Promise<void> {
  const db = await openBlobDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readwrite");
    tx.objectStore(PENDING_STORE).put(Date.now(), blobId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeFromPendingQueue(blobId: string): Promise<void> {
  const db = await openBlobDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readwrite");
    tx.objectStore(PENDING_STORE).delete(blobId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllPending(): Promise<string[]> {
  const db = await openBlobDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readonly");
    const request = tx.objectStore(PENDING_STORE).getAllKeys();
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

async function uploadToServer(blobId: string, data: ArrayBuffer): Promise<boolean> {
  try {
    const res = await fetch(`${BLOB_SERVER_URL}/${blobId}`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
      body: data,
      signal: AbortSignal.timeout(30000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function computeBlobId(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function storeAndSyncBlob(file: File): Promise<{ blobId: string; localUrl: string; sizeBytes: number }> {
  const data = await file.arrayBuffer();
  const blobId = await computeBlobId(data);
  await storeLocalBlob(blobId, data, file.type);
  const localUrl = URL.createObjectURL(new Blob([data], { type: file.type }));
  await addToPendingQueue(blobId);
  uploadToServer(blobId, data).then((ok) => {
    if (ok) {
      removeFromPendingQueue(blobId);
      notifyBlobSynced(blobId);
    }
  });
  return { blobId, localUrl, sizeBytes: data.byteLength };
}

export async function getBlobUrl(blobId: string): Promise<string | null> {
  const local = await getLocalBlob(blobId);
  if (local) {
    const metadata = await getBlobMetadata(blobId);
    const mimeType = metadata?.mimeType || detectMimeType(local);
    return URL.createObjectURL(new Blob([local], { type: mimeType }));
  }
  try {
    const res = await fetch(`${BLOB_SERVER_URL}/${blobId}`, {
      headers: { ...getAuthHeaders() },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    const mimeType = res.headers.get("content-type") || detectMimeType(data);
    await storeLocalBlob(blobId, data, mimeType);
    return URL.createObjectURL(new Blob([data], { type: mimeType }));
  } catch {
    return null;
  }
}

export async function retryPendingUploads(): Promise<{ total: number; succeeded: number }> {
  const pending = await getAllPending();
  if (pending.length === 0) return { total: 0, succeeded: 0 };
  let succeeded = 0;
  for (const blobId of pending) {
    const data = await getLocalBlob(blobId);
    if (!data) {
      await removeFromPendingQueue(blobId);
      continue;
    }
    const ok = await uploadToServer(blobId, data);
    if (ok) {
      await removeFromPendingQueue(blobId);
      succeeded++;
    }
  }
  console.log(`🔄 Blob retry: ${succeeded}/${pending.length} uploaded`);
  return { total: pending.length, succeeded };
}

export async function getPendingCount(): Promise<number> {
  return (await getAllPending()).length;
}

function notifyBlobSynced(blobId: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("scratchpad:blob-synced", { detail: { blobId } }));
  }
}

let retryListenerAdded = false;

export function startBlobSyncListener(): void {
  if (retryListenerAdded) return;
  retryListenerAdded = true;
  window.addEventListener("online", () => {
    console.log("🌐 Back online — retrying pending blob uploads");
    retryPendingUploads();
  });
  if (navigator.onLine) {
    setTimeout(() => retryPendingUploads(), 5000);
  }
  setInterval(() => {
    if (navigator.onLine) retryPendingUploads();
  }, 60_000);
}
