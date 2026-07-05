// Shared durable-log + lead-pipeline forwarding for the A1 Marine Storage
// server. Used by both the quote and contact handlers so the "record first,
// then forward with retries, never a silent failure" behaviour lives in one
// place. Env is read at call time so tests can vary it per case.
import fs from "node:fs";
import path from "node:path";

export const SOURCE_SITE = "a1marinestorage";

export function logDir(): string {
  return process.env.QUOTE_LOG_DIR ?? path.resolve(process.cwd(), ".quote-submissions");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Append a record as one JSONL line to logDir()/<name>. Throws on failure. */
export function appendJsonl(name: string, record: unknown): void {
  const dir = logDir();
  ensureDir(dir);
  fs.appendFileSync(path.join(dir, name), `${JSON.stringify(record)}\n`, "utf-8");
}

/** Append a submission to logDir()/<kind>-YYYY-MM.jsonl. Throws on failure. */
export function appendSubmission(kind: string, receivedAtIso: string, record: unknown): void {
  appendJsonl(`${kind}-${receivedAtIso.slice(0, 7)}.jsonl`, record);
}

/** Best-effort analytics line — never throws. */
export function logAnalytics(record: unknown): void {
  try {
    appendJsonl("analytics.jsonl", record);
    console.log("[analytics]", JSON.stringify(record));
  } catch {
    /* best-effort */
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Forward a lead payload to `${LEAD_WEBHOOK_URL}/api/webhook/<sourcePath>` with
 * retries. Never throws; the durable log is the guaranteed record if all fail.
 * Set STORAGE_WEBHOOK_DISABLED=1 to skip the outbound call.
 */
export async function forwardToLeadPipeline(
  sourcePath: string,
  payload: Record<string, unknown>,
  attempts = 3,
): Promise<void> {
  if (process.env.STORAGE_WEBHOOK_DISABLED === "1") {
    console.log("[lead] outbound forward disabled — durable log retains the submission");
    return;
  }
  const base = (process.env.LEAD_WEBHOOK_URL ?? "https://leads.a1marinecare.ca").replace(/\/+$/, "");
  const secret = process.env.LEAD_WEBHOOK_SECRET ?? process.env.CRM_WEBHOOK_SECRET ?? "";
  const endpoint = `${base}/api/webhook/${sourcePath}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["x-webhook-secret"] = secret;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });
      if (res.ok) {
        console.log(`[lead] forwarded ${sourcePath} (attempt ${attempt}, ${res.status})`);
        return;
      }
      console.error(`[lead] ${sourcePath} responded ${res.status} (attempt ${attempt})`);
    } catch (err) {
      console.error(`[lead] ${sourcePath} forward failed (attempt ${attempt}):`, err instanceof Error ? err.message : String(err));
    }
    if (attempt < attempts) await sleep(attempt * 750);
  }
  console.error(`[lead] ${sourcePath} forward gave up after ${attempts} attempts — see durable log in ${logDir()}`);
}
