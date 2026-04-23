/**
 * Local-First Guardian — Copilot CLI Extension
 *
 * Project-scoped extension that enforces local-first development rules
 * by intercepting agent actions in real time.
 *
 * Hooks:
 *  1. onPreToolUse (git commit) — blocks if source files lack test files
 *  2. onPreToolUse (git push)   — blocks if version wasn't bumped
 *  3. onPostToolUse (git push)  — reminds agent to monitor CI/CD pipeline
 *  4. onPostToolUse (file edits) — contextual reminders for schema/Cargo.toml
 *
 * Location: .github/extensions/local-first-guardian/extension.mjs
 */
import { execSync } from "node:child_process";
import { approveAll } from "@github/copilot-sdk";
import { joinSession } from "@github/copilot-sdk/extension";

// ─── State tracking ────────────────────────────────────────────────

const modifiedSourceFiles = new Set();
const modifiedTestFiles = new Set();

// ─── File classification ───────────────────────────────────────────

const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /test_.*\.py$/,
  /.*_test\.py$/,
  /.*_test\.go$/,
];
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|py|go|rs)$/;
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /build\//,
  /\.config\.[jt]s$/,
  /\.d\.ts$/,
  /scripts\//,
];

function isTestFile(filePath) {
  return TEST_PATTERNS.some((p) => p.test(filePath));
}

function isSourceFile(filePath) {
  return (
    SOURCE_EXTENSIONS.test(filePath) &&
    !isTestFile(filePath) &&
    !IGNORE_PATTERNS.some((p) => p.test(filePath))
  );
}

// ─── Helpers ───────────────────────────────────────────────────────

function isGitCommand(cmd, subcommand) {
  return new RegExp(`\\bgit\\b.*\\b${subcommand}\\b`).test(cmd);
}

function getLocalVersion() {
  try {
    return JSON.parse(
      execSync("node -p \"JSON.stringify(require('./package.json').version)\"", {
        encoding: "utf-8",
        timeout: 5000,
      }).trim()
    );
  } catch {
    return null;
  }
}

function getRemoteVersion() {
  try {
    const raw = execSync("git show origin/master:package.json", {
      encoding: "utf-8",
      timeout: 5000,
    });
    return JSON.parse(raw).version;
  } catch {
    return null; // no remote yet or no origin/master
  }
}

function hasTauriConfig() {
  try {
    execSync("node -e \"require('fs').accessSync('src-tauri/tauri.conf.json')\"", {
      timeout: 3000,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Extension ─────────────────────────────────────────────────────

const session = await joinSession({
  onPermissionRequest: approveAll,

  hooks: {
    // ── PRE-TOOL: intercept git commit and git push ──────────────

    onPreToolUse: async (input) => {
      if (input.toolName !== "powershell") return;
      const cmd = String(input.toolArgs?.command || "");

      // ─ Hook 1: Block git commit if source files lack tests ─
      if (isGitCommand(cmd, "commit")) {
        const untestedFiles = [...modifiedSourceFiles].filter((src) => {
          const base = src.replace(/\.[^.]+$/, "");
          const baseName = base.split(/[\\/]/).pop();
          return ![...modifiedTestFiles].some(
            (t) => t.includes(base) || t.includes(baseName)
          );
        });

        if (untestedFiles.length > 0) {
          return {
            permissionDecision: "deny",
            permissionDecisionReason:
              `[local-first-guardian] BLOCKED: Source files modified without corresponding test files:\n` +
              untestedFiles.map((f) => `  ✗ ${f}`).join("\n") +
              `\n\nWrite or update tests for these files before committing.` +
              `\nThe pre-commit hook will also run tsc, vitest, and eslint.`,
          };
        }
      }

      // ─ Hook 2: Block git push if version wasn't bumped ─
      if (isGitCommand(cmd, "push") && hasTauriConfig()) {
        const local = getLocalVersion();
        const remote = getRemoteVersion();

        if (local && remote && local === remote) {
          return {
            permissionDecision: "deny",
            permissionDecisionReason:
              `[local-first-guardian] BLOCKED: Version not bumped!\n` +
              `  Local:  v${local}\n` +
              `  Remote: v${remote}\n\n` +
              `Bump the version in BOTH package.json AND src-tauri/tauri.conf.json before pushing.\n` +
              `CI creates a GitHub Release per version — reusing a tag will fail the APK build.`,
          };
        }
      }
    },

    // ── POST-TOOL: react after tool execution ────────────────────

    onPostToolUse: async (input) => {
      // ─ Track file modifications for test enforcer ─
      if (input.toolName === "edit" || input.toolName === "create") {
        const filePath = String(input.toolArgs?.path || "").replace(/\\/g, "/");

        if (isTestFile(filePath)) {
          modifiedTestFiles.add(filePath);
        } else if (isSourceFile(filePath)) {
          modifiedSourceFiles.add(filePath);
        }

        // ─ Hook 4a: Schema file edited — remind about ?? [] ─
        if (/schema\.(ts|js)$/i.test(filePath)) {
          return {
            additionalContext:
              `[local-first-guardian] You edited a schema file (${filePath}).\n` +
              `CRITICAL REMINDER: If you added new fields, you MUST:\n` +
              `  1. Add default values in the schema migration (e.g., if (!doc.field) doc.field = [])\n` +
              `  2. Use ?? [] / ?? null fallbacks in EVERY UI component that reads these fields\n` +
              `  3. CRDT docs from other devices may not have the new fields — they will be undefined\n` +
              `Failure to do this causes white-screen crashes on synced devices.`,
          };
        }

        // ─ Hook 4b: Cargo.toml edited — check Tauri rules ─
        if (/Cargo\.toml$/i.test(filePath)) {
          const content = String(
            input.toolArgs?.new_str || input.toolArgs?.file_text || ""
          );
          const warnings = [];

          if (content.includes("native-tls-vendored")) {
            warnings.push(
              "NEVER use native-tls-vendored — it causes Android NDK build failures and runtime crashes. Remove it. Use rustls (default)."
            );
          }

          if (
            content.includes("[lib]") &&
            content.includes("name") &&
            !content.includes('"tauri_app_lib"')
          ) {
            warnings.push(
              'Library name MUST be "tauri_app_lib" — Tauri plugins hardcode System.loadLibrary("tauri_app_lib") in Java/Kotlin. Wrong name = UnsatisfiedLinkError crash on Android.'
            );
          }

          if (warnings.length > 0) {
            return {
              additionalContext:
                `[local-first-guardian] Cargo.toml warnings:\n` +
                warnings.map((w) => `  ⚠ ${w}`).join("\n"),
            };
          }
        }
      }

      // ─ Hook 3: After git push — remind to monitor pipeline and build desktop ─
      if (input.toolName === "powershell") {
        const cmd = String(input.toolArgs?.command || "");
        if (isGitCommand(cmd, "push")) {
          return {
            additionalContext:
              `[local-first-guardian] Push detected! Two things to do:\n\n` +
              `  1. MONITOR CI/CD PIPELINE:\n` +
              `     Run: npm run pipeline:monitor\n` +
              `     This polls GitHub Actions until all workflows complete.\n` +
              `     Do NOT move on to the next task until the pipeline is green.\n` +
              `     If the APK build fails, treat it as a blocking issue — fix immediately.\n\n` +
              `  2. BUILD DESKTOP VERSION:\n` +
              `     Run: cargo tauri build\n` +
              `     Verify the desktop .exe/.app builds successfully.\n` +
              `     CI only builds the Android APK — desktop builds must be verified locally.`,
          };
        }
      }
    },
  },

  tools: [],
});

await session.log("[local-first-guardian] Extension loaded — enforcing test coverage, version bumps, and pipeline monitoring");
