/**
 * UI Screenshot Tool — Copilot CLI Extension
 *
 * Provides a `take_ui_screenshot` tool the agent can call on-demand to
 * see the running Tauri app via CDP. Also tracks UI-affecting file edits
 * and nudges the agent to verify its work visually when appropriate.
 *
 * Flow:
 *   Agent edits UI files → extension nudges "consider taking a screenshot"
 *   Agent calls take_ui_screenshot → extension connects via CDP, screenshots
 *   Agent sees the result → self-corrects if needed
 *
 * The Tauri app is auto-launched if not running on first tool call.
 *
 * Location: .github/extensions/ui-auto-screenshot/extension.mjs
 */
import { readFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { resolve, relative, dirname, extname } from "node:path";
import { execSync } from "node:child_process";
import { approveAll } from "@github/copilot-sdk";
import { joinSession } from "@github/copilot-sdk/extension";

// ─── Configuration ─────────────────────────────────────────────────

const CDP_PORT = 9222;
const CDP_URL = `http://localhost:${CDP_PORT}`;
const SCREENSHOT_DIR = "screenshots/auto";
const APP_STARTUP_TIMEOUT_MS = 60_000;
const UI_ROOTS = ["src/ui/", "src/components/", "src/pages/", "src/app/"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const IGNORE_PATTERNS = [/node_modules/, /\.test\./, /\.spec\./, /\.d\.ts$/, /dist\//, /build\//];

// ─── Dependency Graph ──────────────────────────────────────────────

function buildDependencyGraph() {
  const reverseGraph = new Map();

  function walkDir(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      const full = resolve(dir, entry);
      let stat;
      try { stat = statSync(full); } catch { continue; }
      if (stat.isDirectory()) {
        if (!entry.startsWith(".") && entry !== "node_modules" && entry !== "dist") {
          walkDir(full);
        }
      } else if (SOURCE_EXTENSIONS.has(extname(entry))) {
        processFile(full);
      }
    }
  }

  function processFile(filePath) {
    const relPath = relative(process.cwd(), filePath).replace(/\\/g, "/");
    if (IGNORE_PATTERNS.some((p) => p.test(relPath))) return;

    let content;
    try { content = readFileSync(filePath, "utf-8"); } catch { return; }

    const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?|from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (!importPath || !importPath.startsWith(".")) continue;

      const resolved = resolveImport(dirname(filePath), importPath);
      if (resolved) {
        const relResolved = relative(process.cwd(), resolved).replace(/\\/g, "/");
        if (!reverseGraph.has(relResolved)) reverseGraph.set(relResolved, new Set());
        reverseGraph.get(relResolved).add(relPath);
      }
    }
  }

  function resolveImport(fromDir, importPath) {
    const extensions = [".ts", ".tsx", ".js", ".jsx", ""];
    const indexFiles = ["index.ts", "index.tsx", "index.js", "index.jsx"];
    for (const ext of extensions) {
      const candidate = resolve(fromDir, importPath + ext);
      try { statSync(candidate); return candidate; } catch {}
    }
    for (const idx of indexFiles) {
      const candidate = resolve(fromDir, importPath, idx);
      try { statSync(candidate); return candidate; } catch {}
    }
    return null;
  }

  const srcPath = resolve(process.cwd(), "src");
  if (existsSync(srcPath)) walkDir(srcPath);
  return reverseGraph;
}

function isUIFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return UI_ROOTS.some((root) => normalized.startsWith(root));
}

function affectsUI(filePath, reverseGraph, visited = new Set()) {
  const normalized = filePath.replace(/\\/g, "/");
  if (visited.has(normalized)) return false;
  visited.add(normalized);
  if (isUIFile(normalized)) return true;
  const importedBy = reverseGraph.get(normalized);
  if (!importedBy) return false;
  for (const parent of importedBy) {
    if (affectsUI(parent, reverseGraph, visited)) return true;
  }
  return false;
}

// ─── CDP / App Management ──────────────────────────────────────────

let tauriProcess = null;

async function isCDPAvailable() {
  try {
    const res = await fetch(`${CDP_URL}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForCDP(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isCDPAvailable()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function ensureAppRunning() {
  if (await isCDPAvailable()) return true;
  if (!existsSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"))) return false;

  await session.log("[ui-screenshot] Launching cargo tauri dev...");

  const { spawn } = await import("node:child_process");
  const child = spawn("cargo", ["tauri", "dev"], {
    stdio: "ignore",
    detached: true,
    shell: true,
    cwd: process.cwd(),
  });
  child.unref();
  tauriProcess = child;

  const ready = await waitForCDP(APP_STARTUP_TIMEOUT_MS);
  if (ready) {
    await session.log("[ui-screenshot] ✅ Tauri app ready on CDP port " + CDP_PORT);
  } else {
    await session.log("[ui-screenshot] ⚠️ Tauri app did not start within timeout");
  }
  return ready;
}

async function captureScreenshot(label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeName = label.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeName}-${timestamp}.png`;
  const filepath = `${SCREENSHOT_DIR}/${filename}`;

  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  try {
    const script = `
      const { chromium } = require('playwright');
      (async () => {
        const browser = await chromium.connectOverCDP('${CDP_URL}');
        const page = browser.contexts()[0]?.pages()[0];
        if (!page) { console.error('NO_PAGE'); process.exit(1); }
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: '${filepath.replace(/\\/g, "/")}', fullPage: true });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await new Promise(r => setTimeout(r, 500));
        if (errors.length > 0) console.error('JS_ERRORS:' + JSON.stringify(errors));
        await browser.close();
      })();
    `;
    const result = execSync(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, " ")}"`, {
      encoding: "utf-8",
      timeout: 15000,
      cwd: process.cwd(),
    });

    const jsErrors = [];
    if (result.includes("JS_ERRORS:")) {
      try { jsErrors.push(...JSON.parse(result.split("JS_ERRORS:")[1].trim())); } catch {}
    }

    return { filepath, filename, jsErrors };
  } catch (err) {
    return { filepath: null, error: err.message };
  }
}

// ─── Extension State ───────────────────────────────────────────────

let depGraph = null;
let uiEditCount = 0;

function getReverseGraph() {
  if (!depGraph) depGraph = buildDependencyGraph();
  return depGraph;
}

// ─── Extension ─────────────────────────────────────────────────────

const session = await joinSession({
  onPermissionRequest: approveAll,

  tools: [
    {
      name: "take_ui_screenshot",
      description:
        "Take a screenshot of the running Tauri app via CDP remote debugging. " +
        "Use this after making UI changes to verify your work visually. " +
        "The app will be auto-launched if not running. Returns the screenshot " +
        "file path and any JS console errors detected.",
      skipPermission: true,
      parameters: {
        type: "object",
        properties: {
          label: {
            type: "string",
            description: "Short label for the screenshot (e.g., 'feed-list', 'settings-page'). Used in filename.",
          },
          waitMs: {
            type: "number",
            description: "Extra milliseconds to wait for animations/transitions before screenshotting. Default: 0.",
          },
        },
        required: [],
      },
      handler: async (args) => {
        const label = args.label || "app";
        const waitMs = args.waitMs || 0;

        if (!(await ensureAppRunning())) {
          return {
            textResultForLlm: "Could not connect to Tauri app — no src-tauri/tauri.conf.json found or app failed to start.",
            resultType: "failure",
          };
        }

        if (waitMs > 0) {
          await new Promise((r) => setTimeout(r, waitMs));
        }

        const result = await captureScreenshot(label);
        uiEditCount = 0;

        if (!result.filepath) {
          return {
            textResultForLlm: `Screenshot failed: ${result.error}`,
            resultType: "failure",
          };
        }

        let response = `Screenshot saved to: ${result.filepath}\n`;
        response += `Review it for: layout issues, overflow, empty states, safe area violations, visual regressions.`;

        if (result.jsErrors?.length > 0) {
          response +=
            `\n\n⚠️ JS ERRORS detected in the running app:\n` +
            result.jsErrors.map((e) => `  ✗ ${e}`).join("\n") +
            `\nFix these errors before proceeding!`;
          return { textResultForLlm: response, resultType: "failure" };
        }

        return { textResultForLlm: response, resultType: "success" };
      },
    },
  ],

  hooks: {
    onPostToolUse: async (input) => {
      if (input.toolName !== "edit" && input.toolName !== "create") return;
      const filePath = String(input.toolArgs?.path || "").replace(/\\/g, "/");
      if (!filePath || !filePath.startsWith("src/")) return;
      if (IGNORE_PATTERNS.some((p) => p.test(filePath))) return;

      if (input.toolName === "create") depGraph = null;

      const reverseGraph = getReverseGraph();
      if (!affectsUI(filePath, reverseGraph)) return;

      uiEditCount++;

      // Nudge after a few UI-affecting edits (not every single one)
      if (uiEditCount === 3) {
        return {
          additionalContext:
            `[ui-screenshot] You've made ${uiEditCount} UI-affecting edits. ` +
            `Consider calling take_ui_screenshot to verify your changes visually.`,
        };
      }
      if (uiEditCount >= 6 && uiEditCount % 3 === 0) {
        return {
          additionalContext:
            `[ui-screenshot] ${uiEditCount} UI-affecting edits without a visual check. ` +
            `Call take_ui_screenshot before committing.`,
        };
      }
    },
  },
});

await session.log("[ui-screenshot] Extension loaded — use take_ui_screenshot tool to verify UI changes");
