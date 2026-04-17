#!/usr/bin/env node
/**
 * ScratchPad MCP Server
 *
 * Connects to the Automerge doc via WebSocket and exposes tools
 * for reading/writing notes. Designed for Copilot CLI integration.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";

// --- Types (mirrored from app) ---

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

// --- Config ---

const SYNC_SERVER_URL = process.env.SCRATCHPAD_SYNC_SERVER_URL || "wss://sync.stormlab.app";
const AUTH_TOKEN = process.env.SCRATCHPAD_AUTH_TOKEN || "";
const DOC_URL = process.env.SCRATCHPAD_DOC_URL || "";

if (!DOC_URL) {
  console.error("SCRATCHPAD_DOC_URL environment variable is required");
  process.exit(1);
}

// --- Automerge Connection ---

let repo: Repo;
let docHandle: DocHandle<ScratchPadDoc>;
let docReady = false;

async function initAutomerge(): Promise<void> {
  const wsUrl = AUTH_TOKEN
    ? `${SYNC_SERVER_URL}?token=${encodeURIComponent(AUTH_TOKEN)}`
    : SYNC_SERVER_URL;

  // Catch WebSocket errors so they don't crash the process
  process.on("uncaughtException", (err) => {
    if (err.message?.includes("401") || err.message?.includes("Unexpected server response")) {
      console.error("Auth failed — check SCRATCHPAD_AUTH_TOKEN");
    } else {
      console.error("Uncaught:", err.message);
    }
  });

  repo = new Repo({
    network: [new BrowserWebSocketClientAdapter(wsUrl)],
  });

  docHandle = await repo.find<ScratchPadDoc>(DOC_URL as AutomergeUrl);

  // Wait for doc to be ready (max 15s)
  const ready = await Promise.race([
    docHandle.whenReady().then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 15000)),
  ]);

  if (!ready || !docHandle.doc()) {
    console.error("Failed to load Automerge document within timeout");
    process.exit(1);
  }

  docReady = true;
}

function getDoc(): ScratchPadDoc {
  const doc = docHandle.doc();
  if (!doc) throw new Error("Document not loaded");
  return doc;
}

function getNotes(includeArchived = false): Note[] {
  const doc = getDoc();
  let notes = Object.values(doc.notes);
  if (!includeArchived) {
    notes = notes.filter((n) => !n.archived);
  }
  return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// --- MCP Server ---

const server = new McpServer({
  name: "scratchpad",
  version: "1.0.0",
});

// Tool: get_copilot_commands
server.tool(
  "get_copilot_commands",
  "Get all notes labeled 'copilot' (pending commands from mobile app)",
  {},
  async () => {
    const commands = getNotes().filter((n) => n.labels?.includes("copilot"));
    return {
      content: [
        {
          type: "text" as const,
          text: commands.length === 0
            ? "No pending commands."
            : JSON.stringify(
                commands.map((n) => ({
                  id: n.id,
                  content: n.content,
                  labels: n.labels,
                  updatedAt: n.updatedAt,
                })),
                null,
                2,
              ),
        },
      ],
    };
  },
);

// Tool: mark_command_done
server.tool(
  "mark_command_done",
  "Mark a copilot command as processed: removes 'copilot' label, adds 'copilot-done' label",
  { noteId: z.string().describe("The ID of the note to mark as done") },
  async ({ noteId }) => {
    docHandle.change((doc) => {
      const note = doc.notes[noteId];
      if (!note) throw new Error(`Note not found: ${noteId}`);
      if (!note.labels) note.labels = [];
      note.labels = note.labels.filter((l) => l !== "copilot");
      if (!note.labels.includes("copilot-done")) {
        note.labels.push("copilot-done");
      }
      note.updatedAt = new Date().toISOString();
    });
    return { content: [{ type: "text" as const, text: `Marked ${noteId} as done.` }] };
  },
);

// Tool: list_notes
server.tool(
  "list_notes",
  "List notes with optional filters",
  {
    search: z.string().optional().describe("Filter by content text"),
    label: z.string().optional().describe("Filter by label"),
    tasksOnly: z.boolean().optional().describe("Only return task notes"),
    includeArchived: z.boolean().optional().describe("Include archived notes"),
  },
  async ({ search, label, tasksOnly, includeArchived }) => {
    let notes = getNotes(includeArchived);
    if (search) {
      const q = search.toLowerCase();
      notes = notes.filter((n) => n.content.toLowerCase().includes(q));
    }
    if (label) {
      notes = notes.filter((n) => n.labels?.includes(label));
    }
    if (tasksOnly) {
      notes = notes.filter((n) => n.isTask === true);
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            notes.map((n) => ({
              id: n.id,
              content: n.content.substring(0, 200),
              labels: n.labels,
              isTask: n.isTask,
              taskDone: n.taskDone,
              updatedAt: n.updatedAt,
              archived: n.archived,
            })),
            null,
            2,
          ),
        },
      ],
    };
  },
);

// Tool: create_note
server.tool(
  "create_note",
  "Create a new note",
  {
    content: z.string().describe("Note content"),
    labels: z.array(z.string()).optional().describe("Labels to add"),
  },
  async ({ content, labels }) => {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const note: Note = {
      id,
      content,
      images: [],
      labels: labels ?? [],
      isTask: false,
      taskDone: false,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    docHandle.change((doc) => {
      doc.notes[id] = note;
    });
    return { content: [{ type: "text" as const, text: `Created note ${id}.` }] };
  },
);

// Tool: update_note
server.tool(
  "update_note",
  "Update a note's content",
  {
    noteId: z.string().describe("The note ID"),
    content: z.string().describe("New content"),
  },
  async ({ noteId, content }) => {
    docHandle.change((doc) => {
      const note = doc.notes[noteId];
      if (!note) throw new Error(`Note not found: ${noteId}`);
      note.content = content;
      note.updatedAt = new Date().toISOString();
    });
    return { content: [{ type: "text" as const, text: `Updated note ${noteId}.` }] };
  },
);

// Tool: add_label
server.tool(
  "add_label",
  "Add a label to a note",
  {
    noteId: z.string().describe("The note ID"),
    label: z.string().describe("Label to add"),
  },
  async ({ noteId, label }) => {
    docHandle.change((doc) => {
      const note = doc.notes[noteId];
      if (!note) throw new Error(`Note not found: ${noteId}`);
      if (!note.labels) note.labels = [];
      if (!note.labels.includes(label)) {
        note.labels.push(label);
        note.updatedAt = new Date().toISOString();
      }
    });
    return { content: [{ type: "text" as const, text: `Added label "${label}" to ${noteId}.` }] };
  },
);

// Tool: remove_label
server.tool(
  "remove_label",
  "Remove a label from a note",
  {
    noteId: z.string().describe("The note ID"),
    label: z.string().describe("Label to remove"),
  },
  async ({ noteId, label }) => {
    docHandle.change((doc) => {
      const note = doc.notes[noteId];
      if (!note) throw new Error(`Note not found: ${noteId}`);
      if (!note.labels) note.labels = [];
      note.labels = note.labels.filter((l) => l !== label);
      note.updatedAt = new Date().toISOString();
    });
    return {
      content: [{ type: "text" as const, text: `Removed label "${label}" from ${noteId}.` }],
    };
  },
);

// --- Start ---

async function main() {
  await initAutomerge();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server failed to start:", err);
  process.exit(1);
});
