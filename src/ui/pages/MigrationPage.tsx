import { useState } from "react";

interface MigrationLog {
  type: "info" | "success" | "error" | "warn";
  message: string;
}

/**
 * In-app migration tool: copies all notes + images from Automerge to Verdant.
 * Reads Automerge doc and blob IndexedDB, writes to Verdant client.
 */
export function MigrationPage({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  function log(type: MigrationLog["type"], message: string) {
    setLogs((prev) => [...prev, { type, message }]);
  }

  async function runMigration() {
    setRunning(true);
    setLogs([]);

    try {
      log("info", "Loading Automerge store...");
      const amRepo = await import("../../infra/automerge/repo.js");
      const amStore = await import("../../infra/automerge/note-store.js");
      const blobSync = await import("../../infra/automerge/blob-sync.js");

      // Force Automerge to connect to server and sync before reading
      log("info", "Syncing with server (waiting up to 15 seconds)...");
      const handle = await amRepo.getDocHandle();
      const startWait = Date.now();
      while (Date.now() - startWait < 15_000) {
        const doc = handle.doc();
        if (doc && Object.keys(doc.notes || {}).length > 0) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Load all notes (including archived)
      const allNotes = await amStore.listNotes({ includeArchived: true });
      log("info", `Found ${allNotes.length} notes in Automerge`);

      if (allNotes.length === 0) {
        log("warn", "No notes to migrate");
        setDone(true);
        setRunning(false);
        return;
      }

      log("info", "Initializing Verdant client...");
      const { getClient } = await import("../../infra/verdant/note-store.js");
      const client = await getClient();

      let migratedNotes = 0;
      let migratedImages = 0;
      let failedImages = 0;

      for (const note of allNotes) {
        try {
          // Collect image files before creating the note
          const imageEntries: { file: File | null; fileName: string; sizeBytes: number; createdAt: string }[] = [];

          if (note.images && note.images.length > 0) {
            for (const img of note.images) {
              try {
                // Try to get the blob data from local IndexedDB first, then server
                const blobData = await blobSync.getLocalBlob(img.blobId);
                if (blobData) {
                  const file = new File([blobData], img.fileName, { type: "image/jpeg" });
                  imageEntries.push({
                    file,
                    fileName: img.fileName,
                    sizeBytes: img.sizeBytes,
                    createdAt: img.createdAt,
                  });
                  migratedImages++;
                } else {
                  // Try downloading from server
                  const url = await blobSync.getBlobUrl(img.blobId);
                  if (url) {
                    const res = await fetch(url);
                    const data = await res.arrayBuffer();
                    const file = new File([data], img.fileName, { type: "image/jpeg" });
                    imageEntries.push({
                      file,
                      fileName: img.fileName,
                      sizeBytes: img.sizeBytes,
                      createdAt: img.createdAt,
                    });
                    migratedImages++;
                    URL.revokeObjectURL(url);
                  } else {
                    log("warn", `  Image ${img.blobId.slice(0, 12)}... not found — skipping`);
                    imageEntries.push({ file: null, fileName: img.fileName, sizeBytes: img.sizeBytes, createdAt: img.createdAt });
                    failedImages++;
                  }
                }
              } catch {
                log("warn", `  Image ${img.blobId.slice(0, 12)}... failed — skipping`);
                imageEntries.push({ file: null, fileName: img.fileName, sizeBytes: img.sizeBytes, createdAt: img.createdAt });
                failedImages++;
              }
            }
          }

          // Create note in Verdant
          await client.notes.put({
            id: note.id,
            content: note.content,
            images: imageEntries,
            labels: note.labels || [],
            isTask: note.isTask ?? false,
            taskDone: note.taskDone ?? false,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            archived: note.archived,
          });

          const preview = note.content.slice(0, 40).replace(/\n/g, " ");
          const imgCount = note.images?.length || 0;
          log("success", `✓ ${note.id.slice(0, 16)}... "${preview}" ${imgCount > 0 ? `(${imgCount} images)` : ""}`);
          migratedNotes++;
        } catch (err) {
          log("error", `✗ ${note.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      log("info", "---");
      log("success", `Migration complete: ${migratedNotes}/${allNotes.length} notes, ${migratedImages} images migrated`);
      if (failedImages > 0) {
        log("warn", `${failedImages} images could not be migrated`);
      }
      setDone(true);
    } catch (err) {
      log("error", `Migration failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-amber-50 z-50 flex flex-col">
      <header className="bg-amber-600 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Migración Automerge → Verdant</h1>
        <button onClick={onClose} className="text-amber-200 hover:text-white text-sm">
          Cerrar
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-amber-800 mb-3">
            Esta herramienta copia todas las notas e imágenes desde Automerge hacia Verdant.
            Los datos originales no se modifican.
          </p>
          <button
            onClick={runMigration}
            disabled={running || done}
            className="w-full py-2 px-4 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? "Migrando..." : done ? "✅ Migración completada" : "Iniciar migración"}
          </button>
        </div>

        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs space-y-0.5 max-h-96 overflow-auto">
            {logs.map((entry, i) => (
              <div
                key={i}
                className={
                  entry.type === "error" ? "text-red-400" :
                  entry.type === "warn" ? "text-yellow-400" :
                  entry.type === "success" ? "text-green-400" :
                  "text-gray-300"
                }
              >
                {entry.message}
              </div>
            ))}
          </div>
        )}

        {done && (
          <div className="bg-green-50 rounded-lg p-4 text-sm text-green-800">
            <p className="font-medium mb-1">¡Migración completada!</p>
            <p>Cierra esta página y verifica que tus notas estén en la app.</p>
          </div>
        )}
      </div>
    </div>
  );
}
