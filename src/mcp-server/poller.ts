#!/usr/bin/env node
/**
 * ScratchPad Command Poller
 * 
 * Standalone background process that polls Automerge for notes labeled "copilot",
 * marks them as "copilot-done", and sends them to the agent-bus.
 * 
 * Usage: node --import tsx/esm src/mcp-server/poller.ts
 */

import { Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface Note {
  id: string;
  content: string;
  labels?: string[];
  updatedAt: string;
  archived: boolean;
}

interface ScratchPadDoc {
  schemaVersion: number;
  notes: { [id: string]: Note };
}

const SYNC_SERVER_URL = process.env.SCRATCHPAD_SYNC_SERVER_URL || "wss://sync.stormlab.app";
const AUTH_TOKEN = process.env.SCRATCHPAD_AUTH_TOKEN || "";
const DOC_URL = process.env.SCRATCHPAD_DOC_URL || "";
const POLL_INTERVAL_MS = 15_000; // 15 seconds

// Agent-bus uses file-based storage
const AGENT_BUS_DIR = join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".copilot",
  "agent-bus-data",
  "channels",
);

if (!DOC_URL) {
  console.error("[poller] SCRATCHPAD_DOC_URL is required");
  process.exit(1);
}

interface AgentBusMessage {
  id: number;
  from: string;
  message: string;
  topic: string;
  timestamp: string;
}

interface AgentBusData {
  messages: AgentBusMessage[];
  agents: { name: string; description?: string }[];
}

function sendToAgentBus(message: string, topic: string): void {
  try {
    if (!existsSync(AGENT_BUS_DIR)) mkdirSync(AGENT_BUS_DIR, { recursive: true });
    const file = join(AGENT_BUS_DIR, "mobile-commands.json");
    let data: AgentBusData = { messages: [], agents: [] };
    if (existsSync(file)) {
      data = JSON.parse(readFileSync(file, "utf-8")) as AgentBusData;
    }
    const nextId = data.messages.length > 0
      ? Math.max(...data.messages.map((m) => m.id)) + 1
      : 1;
    data.messages.push({
      id: nextId,
      from: "scratchpad-poller",
      message,
      topic,
      timestamp: new Date().toISOString(),
    });
    writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[poller] Agent-bus write failed:", (err as Error).message);
  }
}

async function main() {
  const wsUrl = AUTH_TOKEN
    ? `${SYNC_SERVER_URL}?token=${encodeURIComponent(AUTH_TOKEN)}`
    : SYNC_SERVER_URL;

  // Handle WebSocket errors gracefully
  process.on("uncaughtException", (err) => {
    console.error("[poller] Uncaught:", err.message);
  });

  console.log("[poller] Connecting to Automerge...");
  const repo = new Repo({
    network: [new BrowserWebSocketClientAdapter(wsUrl)],
  });

  const docHandle: DocHandle<ScratchPadDoc> = await repo.find<ScratchPadDoc>(DOC_URL as AutomergeUrl);
  await docHandle.whenReady();
  
  const doc = docHandle.doc();
  if (!doc) {
    console.error("[poller] Failed to load document");
    process.exit(1);
  }

  console.log(`[poller] Connected! ${Object.keys(doc.notes).length} notes. Polling every ${POLL_INTERVAL_MS / 1000}s...`);

  // Poll loop
  async function poll() {
    try {
      const currentDoc = docHandle.doc();
      if (!currentDoc) return;

      const commands = Object.values(currentDoc.notes).filter(
        (n) => !n.archived && n.labels?.includes("copilot")
      );

      for (const cmd of commands) {
        console.log(`[poller] Found command: "${cmd.content.substring(0, 50)}..."`);

        // Mark as done
        docHandle.change((d) => {
          const note = d.notes[cmd.id];
          if (!note) return;
          if (!note.labels) note.labels = [];
          note.labels = note.labels.filter((l) => l !== "copilot");
          if (!note.labels.includes("copilot-done")) {
            note.labels.push("copilot-done");
          }
          note.updatedAt = new Date().toISOString();
        });

        // Send to agent-bus (file-based)
        sendToAgentBus(cmd.content, "Mobile command from ScratchPad");
        console.log(`[poller] Sent to agent-bus and marked done: ${cmd.id}`);
      }
    } catch (err) {
      console.error("[poller] Poll error:", (err as Error).message);
    }
  }

  // Initial poll
  await poll();

  // Continuous polling
  setInterval(poll, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[poller] Fatal:", err);
  process.exit(1);
});
