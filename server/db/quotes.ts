// Persisting a lead — Postgres first, JSONL second, success if EITHER worked.
//
// THE POINT OF THIS FILE. Until Phase 0 the only record of a lead was a JSONL
// file under QUOTE_LOG_DIR, which lives on Railway's ephemeral filesystem and
// does not survive a redeploy. Postgres is now the record; the JSONL write
// stays as a mirror, because a database that is briefly unreachable must not
// cost the yard a customer.
//
// A handler reports success when either store accepted the record. It reports
// failure only when BOTH refused — which is the honest condition for telling a
// customer to try again, and the only one that satisfies "durable record first,
// then forward, never a fake success".
import { isConfigured, query } from "./index";

/** The `source` column's domain. Matches the check in 001_init.sql's comment. */
export type QuoteSource =
  | "calculator"
  | "pdf_download"
  | "saved"
  | "contact"
  | "winter-quote"
  | "locality";

export interface QuoteRow {
  id: string;
  receivedAt: string;
  source: QuoteSource;
  /** Normalised at the edge. Stored whole so a lead is never split across tables. */
  contact: Record<string, unknown>;
  reference?: string;
  status?: string;
  quoteInput?: unknown;
  quote?: unknown;
  selection?: unknown;
  boat?: unknown;
  meta?: Record<string, unknown>;
  depositUrl?: string;
  empirevuLeadId?: string;
}

export interface PersistResult {
  /** True when Postgres accepted the row. */
  db: boolean;
  /** True when the JSONL mirror was written. */
  jsonl: boolean;
}

/**
 * Write one lead to Postgres.
 *
 * Returns false rather than throwing when the database is unset or unreachable
 * — `query()` already draws that line, reporting connection-shaped failures as
 * `ok: false` while letting a genuine SQL error (a typo, a missing column)
 * throw. We catch that too, because a bug in this query must not be the reason
 * a customer loses their quote; it is logged loudly instead.
 */
export async function insertQuote(row: QuoteRow): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const res = await query(
      `insert into quotes
         (id, reference, received_at, source, status, contact,
          quote_input, quote, selection, boat, meta, deposit_url, empirevu_lead_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       on conflict (id) do nothing`,
      [
        row.id,
        row.reference ?? null,
        row.receivedAt,
        row.source,
        row.status ?? "new",
        JSON.stringify(row.contact),
        row.quoteInput === undefined ? null : JSON.stringify(row.quoteInput),
        row.quote === undefined ? null : JSON.stringify(row.quote),
        row.selection === undefined ? null : JSON.stringify(row.selection),
        row.boat === undefined ? null : JSON.stringify(row.boat),
        JSON.stringify(row.meta ?? {}),
        row.depositUrl ?? null,
        row.empirevuLeadId ?? null,
      ]
    );
    return res.ok;
  } catch (err) {
    console.error(
      "[db] insert into quotes failed:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}

/**
 * Record what EmpireVu came back with, once the bounded wait resolves.
 *
 * Best-effort by definition: the row is already written and the customer has
 * already been answered. This only enriches it, so a failure here is a log
 * line, never a thrown error.
 */
export async function attachEmpireVuResult(
  id: string,
  fields: { depositUrl?: string; leadId?: string }
): Promise<void> {
  if (!isConfigured()) return;
  if (!fields.depositUrl && !fields.leadId) return;
  try {
    await query(
      `update quotes
         set deposit_url = coalesce($2, deposit_url),
             empirevu_lead_id = coalesce($3, empirevu_lead_id),
             status = case when $2 is not null then 'quoted' else status end,
             updated_at = now()
       where id = $1`,
      [id, fields.depositUrl ?? null, fields.leadId ?? null]
    );
  } catch (err) {
    console.error(
      "[db] could not attach the EmpireVu result:",
      err instanceof Error ? err.message : String(err)
    );
  }
}
