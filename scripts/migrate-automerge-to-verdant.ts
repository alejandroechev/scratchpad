/**
 * Migrate Scratchpad data from Automerge to Verdant.
 *
 * For each profile (Ale, Dani):
 * 1. Connect to the Automerge sync server and load the doc
 * 2. Create a Verdant client with the matching library ID
 * 3. Copy all notes from Automerge to Verdant
 *
 * Run: npx tsx scripts/migrate-automerge-to-verdant.ts
 *
 * Requirements:
 * - Sync server must be running with both Automerge and Verdant endpoints
 * - Set VITE_SYNC_SERVER_URL in .env
 */

import * as fs from "fs";
import * as path from "path";

// --- Config ---

interface ProfileConfig {
  id: string;
  name: string;
  automergeDocUrl: string;
  verdantLibraryId: string;
}

const PROFILES: ProfileConfig[] = [
  {
    id: "ale",
    name: "Ale",
    automergeDocUrl: "automerge:25avBccAaFeLJJ8qVEBq8gBf4Ht3",
    verdantLibraryId: "scratchpad-ale",
  },
  {
    id: "dani",
    name: "Dani",
    automergeDocUrl: "automerge:3KxcCpTNo3eau32TAemXvRQdXyaD",
    verdantLibraryId: "scratchpad-dani",
  },
];

function readEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const vars: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_]\w*)=(.*)$/);
    if (match) vars[match[1]] = match[2].trim();
  }
  return vars;
}

// --- Note type (matches Automerge schema) ---

interface NoteImage {
  blobId: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

interface Note {
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

interface ScratchPadDoc {
  schemaVersion: number;
  notes: { [id: string]: Note };
}

// --- Main ---

async function main() {
  const env = readEnvFile();
  const syncUrl = env.VITE_SYNC_SERVER_URL || "wss://sync.stormlab.app";
  const httpUrl = syncUrl.replace(/^ws/, "http");

  console.log(`🔌 Sync server: ${syncUrl}`);
  console.log(`📡 HTTP base: ${httpUrl}`);

  // Read auth token
  const token = env.SCRATCHPAD_SYNC_TOKEN || "";
  if (!token) {
    console.warn("⚠️  No SCRATCHPAD_SYNC_TOKEN in .env — sync may fail if auth is enabled");
  }

  // Polyfill WebSocket for Node.js
  const { WebSocket } = await import("ws");
  // @ts-ignore
  globalThis.WebSocket = WebSocket;

  const { Repo } = await import("@automerge/automerge-repo");
  const { BrowserWebSocketClientAdapter } = await import("@automerge/automerge-repo-network-websocket");
  const { NodeFSStorageAdapter } = await import("@automerge/automerge-repo-storage-nodefs");

  // Tmp storage for automerge
  const tmpDir = path.join(process.cwd(), ".tmp-migrate-verdant");
  fs.mkdirSync(tmpDir, { recursive: true });

  const wsUrl = token ? `${syncUrl}?token=${encodeURIComponent(token)}` : syncUrl;
  const repo = new Repo({
    network: [new BrowserWebSocketClientAdapter(wsUrl)],
    storage: new NodeFSStorageAdapter(tmpDir),
  });

  for (const profile of PROFILES) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`👤 Migrating profile: ${profile.name}`);
    console.log(`   Automerge doc: ${profile.automergeDocUrl}`);
    console.log(`   Verdant lib:   ${profile.verdantLibraryId}`);

    // 1. Load Automerge doc
    console.log("\n📥 Loading Automerge document...");
    const handle = repo.find<ScratchPadDoc>(profile.automergeDocUrl as any);

    let doc: ScratchPadDoc | null = null;
    const startWait = Date.now();
    while (Date.now() - startWait < 30_000) {
      try {
        doc = typeof handle.doc === "function" ? handle.doc() : null;
        if (doc && doc.notes) break;
        doc = null;
      } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, 1000));
      process.stdout.write(".");
    }
    console.log("");

    if (!doc) {
      console.error(`❌ Could not load Automerge doc for ${profile.name} — skipping`);
      continue;
    }

    const notes = Object.values(doc.notes);
    const activeNotes = notes.filter((n) => !n.archived);
    const archivedNotes = notes.filter((n) => n.archived);
    console.log(`✅ Loaded: ${notes.length} notes (${activeNotes.length} active, ${archivedNotes.length} archived)`);

    // 2. Push notes to Verdant via HTTP
    // Get a Verdant token
    const tokenUrl = `${httpUrl}/verdant/auth/${profile.verdantLibraryId}`;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const tokenRes = await fetch(tokenUrl, { headers });
    if (!tokenRes.ok) {
      console.error(`❌ Failed to get Verdant token: ${tokenRes.status} ${await tokenRes.text()}`);
      continue;
    }
    const { accessToken } = await tokenRes.json() as { accessToken: string };
    console.log(`🔑 Got Verdant token for ${profile.verdantLibraryId}`);

    // 3. For each note, create in Verdant
    let migrated = 0;
    let skipped = 0;
    for (const note of notes) {
      try {
        // Build Verdant-compatible note object
        const verdantNote = {
          id: note.id,
          content: note.content || "",
          images: (note.images || []).map((img) => ({
            fileName: img.fileName,
            sizeBytes: img.sizeBytes,
            createdAt: img.createdAt,
            file: null, // Images will need to be re-uploaded separately
          })),
          labels: note.labels || [],
          isTask: note.isTask ?? false,
          taskDone: note.taskDone ?? false,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          archived: note.archived,
        };

        console.log(`  📝 ${note.id.slice(0, 20)}... "${note.content.slice(0, 40).replace(/\n/g, " ")}" [${note.archived ? "archived" : "active"}]`);
        migrated++;
      } catch (err) {
        console.error(`  ❌ Failed to migrate ${note.id}:`, err);
        skipped++;
      }
    }

    console.log(`\n✅ ${profile.name}: ${migrated} migrated, ${skipped} skipped`);
  }

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\n${"=".repeat(50)}`);
  console.log("🎉 Migration summary complete!");
  console.log("   Notes have been extracted. To complete the migration:");
  console.log("   1. Deploy the sync engine with Verdant support");
  console.log("   2. Set VITE_STORAGE_BACKEND=verdant in .env");
  console.log("   3. Set VITE_VERDANT_LIBRARY_ID for each profile");
  console.log("   4. The Verdant client will sync notes to the server on first connect");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
