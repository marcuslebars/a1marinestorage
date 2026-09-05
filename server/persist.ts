// One place that answers "is this lead safely recorded?".
//
// Both stores are tried, in order, and the lead survives if EITHER accepts it:
//
//   Postgres  — the record. Survives a redeploy.
//   JSONL     — the mirror. Survives Postgres being down.
//
// Reporting success on either is deliberate. Requiring both would mean a
// momentarily unreachable database turns a real customer away from a form they
// have already filled in, and the mirror would hold their lead the whole time.
// Requiring neither would be the fake success the conventions forbid.
import { insertQuote, type QuoteRow } from "./db/quotes";
import { appendSubmission } from "./lead-pipeline";

export interface PersistOutcome {
  /** True when at least one store accepted the lead — the handler may reply 200. */
  ok: boolean;
  db: boolean;
  jsonl: boolean;
}

/**
 * Persist a lead to Postgres and to the JSONL mirror.
 *
 * `jsonlKind` names the mirror file (`<kind>-YYYY-MM.jsonl`); `record` is the
 * full legacy record shape, unchanged, so existing log readers keep working.
 */
export async function persistLead(
  row: QuoteRow,
  jsonlKind: string,
  record: unknown
): Promise<PersistOutcome> {
  const db = await insertQuote(row);

  let jsonl = false;
  try {
    appendSubmission(jsonlKind, row.receivedAt, record);
    jsonl = true;
  } catch (err) {
    // Only worth shouting about when Postgres did not catch it. On Railway the
    // filesystem write is the one expected to be useless, so a failure here
    // while the database is healthy is noise.
    const msg = err instanceof Error ? err.message : String(err);
    if (db)
      console.warn(
        `[persist] JSONL mirror failed (row is in Postgres): ${msg}`
      );
    else
      console.error(
        `[persist] JSONL mirror failed and Postgres did not take it: ${msg}`
      );
  }

  if (!db && !jsonl) {
    console.error(
      `[persist] NEITHER store accepted lead ${row.id} (${row.source}) — the customer is being asked to retry`
    );
  }
  return { ok: db || jsonl, db, jsonl };
}
