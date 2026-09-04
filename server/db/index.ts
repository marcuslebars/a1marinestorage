// Postgres access — a pool, a query helper, and a transaction helper.
//
// ABSENT-SAFE BY DESIGN. With no DATABASE_URL the module reports "not
// configured" and every call returns an empty result instead of throwing. Local
// dev, CI and a misconfigured deploy all still boot, and the JSONL mirror stays
// the record. The alternative — throwing at import time — would turn a missing
// env var into a site that will not start, which is a worse failure than a site
// that starts and logs loudly.
//
// The caller decides what a missing database MEANS. `isConfigured()` exists so a
// handler can say "Postgres unavailable, fell back to JSONL" rather than
// silently believing it wrote a row.
import { Pool, type PoolClient, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let warned = false;

/** True when a DATABASE_URL was supplied and a pool could be built. */
export function isConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool | null {
  if (!isConfigured()) {
    if (!warned) {
      warned = true;
      console.warn(
        "[db] DATABASE_URL is not set — Postgres disabled; the JSONL log is the record."
      );
    }
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Railway's managed Postgres presents a certificate the default agent
      // rejects. This is Railway's own private network, not the open internet.
      ssl: /\bsslmode=disable\b/.test(process.env.DATABASE_URL ?? "")
        ? undefined
        : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    // A pool error with no listener crashes the process. Storage traffic is
    // bursty and idle connections do get dropped; that must not take the site.
    pool.on("error", err => {
      console.error("[db] idle client error:", err.message);
    });
  }
  return pool;
}

export interface QueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  rowCount: number;
  /** False when Postgres is not configured — the query never ran. */
  ok: boolean;
}

/**
 * Run one parameterised statement.
 *
 * NEVER THROWS on a connection problem — those are reported through `ok` so a
 * request handler can fall back rather than 500. A genuine SQL error (bad
 * syntax, constraint violation) DOES throw, because that is a bug to fix, not a
 * condition to tolerate.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const p = getPool();
  if (!p) return { rows: [], rowCount: 0, ok: false };
  try {
    const res = await p.query<T>(text, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount ?? res.rows.length,
      ok: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Connection-shaped failures are survivable; anything else is a real bug.
    if (
      /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Connection terminated|too many clients/i.test(
        message
      )
    ) {
      console.error("[db] query failed (falling back):", message);
      return { rows: [], rowCount: 0, ok: false };
    }
    throw err;
  }
}

/**
 * Run a function inside a transaction, rolling back on any throw.
 *
 * Returns null when Postgres is not configured, so the caller takes the same
 * fallback path it would for a connection failure.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T | null> {
  const p = getPool();
  if (!p) return null;
  const client = await p.connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      // The connection is already gone; the transaction died with it.
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Close the pool. For tests and clean shutdown only. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Reset memoised state so a test can change DATABASE_URL between cases. */
export function __resetForTests(): void {
  pool = null;
  warned = false;
}
