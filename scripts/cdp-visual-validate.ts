/**
 * CDP Visual Validation — connects Playwright to the real Tauri desktop app
 * via Chrome DevTools Protocol. Takes screenshots and checks for JS errors.
 *
 * Usage: npx tsx scripts/cdp-visual-validate.ts
 * Requires: Tauri desktop app built and running with --remote-debugging-port=9222
 */
import { chromium, type Browser, type Page } from "playwright";
import { spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";

const CDP_PORT = 9222;
const CDP_URL = `http://localhost:${CDP_PORT}`;
const SCREENSHOT_DIR = "screenshots";
const STARTUP_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 1_000;

async function waitForCDP(timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${CDP_URL}/json/version`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`CDP not available on ${CDP_URL} after ${timeoutMs}ms`);
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // Try to connect to already-running app, otherwise build & launch
  let appProcess: ChildProcess | null = null;
  try {
    await waitForCDP(3_000);
    console.log("✅ Connected to already-running Tauri app");
  } catch {
    console.log("🚀 Launching Tauri desktop app...");
    appProcess = spawn("cargo", ["tauri", "dev"], {
      stdio: "ignore",
      detached: true,
      shell: true,
    });
    await waitForCDP(STARTUP_TIMEOUT_MS);
    console.log("✅ Tauri app started, CDP available");
  }

  let browser: Browser | null = null;
  const errors: string[] = [];

  try {
    browser = await chromium.connectOverCDP(CDP_URL);
    const page: Page =
      browser.contexts()[0]?.pages()[0] ??
      (await browser.contexts()[0].newPage());

    // Collect JS errors
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    // Wait for app to be interactive
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => {});

    // Take screenshot of main screen
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "cdp-main.png"),
      fullPage: true,
    });
    console.log("📸 Screenshot: cdp-main.png");

    // TODO: Add app-specific navigation screenshots here
    // Example:
    // await page.click('[data-testid="settings-tab"]');
    // await page.screenshot({ path: path.join(SCREENSHOT_DIR, "cdp-settings.png") });

    // Report errors
    if (errors.length > 0) {
      console.error(`\n❌ Found ${errors.length} JS error(s) in Tauri app:`);
      errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
      process.exit(1);
    }

    console.log("✅ CDP validation passed — no JS errors, screenshots saved");
  } finally {
    await browser?.close().catch(() => {});
    if (appProcess) {
      try {
        process.kill(-appProcess.pid!, "SIGTERM");
      } catch {}
    }
  }
}

main().catch((err) => {
  console.error("❌ CDP validation failed:", err.message);
  process.exit(1);
});
