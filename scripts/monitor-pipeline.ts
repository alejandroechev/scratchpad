/**
 * Monitor GitHub Actions pipeline after push.
 * Polls the latest workflow run until it completes, then reports the result.
 *
 * Usage: npx tsx scripts/monitor-pipeline.ts
 * Requires: gh CLI authenticated
 */
import { execSync } from "child_process";

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const MAX_WAIT_MS = 20 * 60_000; // 20 minutes

interface WorkflowRun {
  status: string;
  conclusion: string | null;
  name: string;
  html_url: string;
  head_sha: string;
}

function gh(args: string): string {
  return execSync(`gh ${args}`, { encoding: "utf-8" }).trim();
}

function getLatestRuns(): WorkflowRun[] {
  const json = gh(
    `run list --limit 5 --json status,conclusion,name,htmlUrl,headSha`
  );
  return JSON.parse(json).map((r: any) => ({
    status: r.status,
    conclusion: r.conclusion,
    name: r.name,
    html_url: r.htmlUrl,
    head_sha: r.headSha,
  }));
}

function getHeadSha(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
}

async function main() {
  const headSha = getHeadSha();
  console.log(`🔍 Monitoring pipelines for commit ${headSha.slice(0, 8)}...`);
  console.log(`   Polling every ${POLL_INTERVAL_MS / 1000}s (max ${MAX_WAIT_MS / 60_000} min)\n`);

  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const runs = getLatestRuns().filter((r) => r.head_sha === headSha);

    if (runs.length === 0) {
      console.log("⏳ No workflow runs found yet for this commit, waiting...");
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    const pending = runs.filter((r) => r.status !== "completed");
    const completed = runs.filter((r) => r.status === "completed");

    for (const run of completed) {
      const icon = run.conclusion === "success" ? "✅" : "❌";
      console.log(`${icon} ${run.name}: ${run.conclusion} — ${run.html_url}`);
    }
    for (const run of pending) {
      console.log(`⏳ ${run.name}: ${run.status}...`);
    }

    if (pending.length === 0) {
      const failed = completed.filter((r) => r.conclusion !== "success");
      if (failed.length > 0) {
        console.log(
          `\n❌ ${failed.length} pipeline(s) failed! Fix before considering work complete.`
        );
        process.exit(1);
      }
      console.log(`\n✅ All ${completed.length} pipeline(s) passed!`);
      process.exit(0);
    }

    console.log("");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.error("⏰ Timeout waiting for pipelines to complete.");
  process.exit(1);
}

main().catch((err) => {
  console.error("❌ Pipeline monitoring failed:", err.message);
  process.exit(1);
});
