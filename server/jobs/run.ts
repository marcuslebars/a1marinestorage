// Run every job once, then exit. Railway cron calls this every 15 minutes.
//
// Jobs are idempotent through the notifications unique key, so overlapping runs
// are safe and a missed run costs only latency.
//
// ONE JOB'S FAILURE MUST NOT STOP THE OTHERS. They are independent; aborting the
// batch because the first threw would let one bad query silence every reminder.
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { closePool } from "../db/index";
import type { Job } from "./types";

const here = dirname(fileURLToPath(import.meta.url));

async function loadJobs(): Promise<Job[]> {
  const files = readdirSync(here).filter(
    f => f.endsWith(".job.ts") || f.endsWith(".job.js")
  );
  const jobs: Job[] = [];
  for (const file of files.sort()) {
    // pathToFileURL, not a bare path: ESM import() rejects a Windows path
    // ("C:\...") with ERR_UNSUPPORTED_ESM_URL_SCHEME. It happens to work on
    // Linux, so a plain join would run fine on Railway and fail on every
    // developer machine — the worst place for the difference to live.
    const mod = (await import(pathToFileURL(join(here, file)).href)) as {
      job?: Job;
    };
    if (mod.job) jobs.push(mod.job);
    else console.error(`[jobs] ${file} has no exported \`job\` — skipped`);
  }
  return jobs;
}

export async function runAllJobs(): Promise<{ ok: number; failed: number }> {
  const jobs = await loadJobs();
  console.log(`[jobs] running ${jobs.length} job(s)`);
  let ok = 0;
  let failed = 0;

  for (const j of jobs) {
    const started = Date.now();
    try {
      const res = await j.run();
      ok += 1;
      console.log(
        `[jobs] ${j.name}: processed ${res.processed} in ${Date.now() - started}ms${res.notes ? ` — ${res.notes}` : ""}`
      );
    } catch (err) {
      failed += 1;
      console.error(
        `[jobs] ${j.name} FAILED:`,
        err instanceof Error ? err.message : err
      );
    }
  }
  return { ok, failed };
}

if (process.argv[1] && /run\.(ts|js)$/.test(process.argv[1])) {
  runAllJobs()
    .then(async ({ failed }) => {
      await closePool().catch(() => {});
      // Non-zero on any failure so the cron service surfaces it.
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(async err => {
      console.error("[jobs] runner crashed:", err);
      await closePool().catch(() => {});
      process.exit(1);
    });
}
