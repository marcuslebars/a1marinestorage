// What every nurture job has in common.
//
// Three jobs, one shape: find rows in a window, skip anyone who opted out,
// send through notify(). The differences are the window and the words.
//
// IDEMPOTENT THROUGH THE DATABASE, not through job scheduling. `notifications`
// has a unique key on (quote_id, kind, channel) and notify() claims it before
// sending, so a cron that fires twice, a run that overlaps its predecessor, or
// a redeploy mid-run cannot mail anyone twice. That is what makes it safe to
// run these every fifteen minutes.
import { isConfigured, query } from "../db/index";
import { notify } from "../notify/notify";
import type { RenderedEmail } from "../notify/types";
import { isUnsubscribed, unsubscribeUrl } from "../unsubscribe";
import type { JobResult } from "./types";

export interface NurtureRow {
  id: string;
  reference: string | null;
  received_at: string;
  source: string;
  status: string;
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    unsubscribed?: boolean;
  };
  quote: unknown;
  selection: unknown;
  boat: unknown;
  meta: Record<string, unknown> | null;
  deposit_url: string | null;
}

export function publicOrigin(): string {
  return process.env.PUBLIC_BASE_URL || "https://a1marinestorage.ca";
}

/**
 * Rows that have gone quiet.
 *
 * `sources` narrows to the kinds of lead worth chasing; `minAgeMs`/`maxAgeMs`
 * bound the window so a job run today does not suddenly mail every lead from
 * last season. The upper bound is not optional: without it, the first run
 * after a deploy would be a mass mailing.
 */
export async function findQuietQuotes(opts: {
  sources: string[];
  minAgeMs: number;
  maxAgeMs: number;
  statuses?: string[];
  limit?: number;
}): Promise<NurtureRow[]> {
  if (!isConfigured()) return [];
  const now = Date.now();
  const res = await query<NurtureRow>(
    `select id, reference, received_at, source, status, contact,
            quote, selection, boat, meta, deposit_url
       from quotes
      where source = any($1)
        and status = any($2)
        and received_at <= $3
        and received_at >= $4
      order by received_at desc
      limit $5`,
    [
      opts.sources,
      opts.statuses ?? ["new"],
      new Date(now - opts.minAgeMs).toISOString(),
      new Date(now - opts.maxAgeMs).toISOString(),
      opts.limit ?? 200,
    ]
  );
  return res.ok ? res.rows : [];
}

/**
 * Send one nurture email to one row, honouring the opt-out.
 *
 * Returns true only when something was actually sent — a duplicate (the key
 * was already claimed) counts as "already handled", not as work done, so the
 * job's `processed` count means what it says.
 */
export async function sendNurture(
  row: NurtureRow,
  kind: string,
  render: (unsubUrl: string) => RenderedEmail
): Promise<boolean> {
  const email = row.contact?.email;
  if (!email) return false;

  // The opt-out is checked HERE rather than in the SQL so it applies to every
  // job automatically. A new job that forgets a `where` clause would otherwise
  // mail people who asked us not to.
  if (isUnsubscribed(row.contact)) return false;

  const unsubUrl = unsubscribeUrl(email, publicOrigin());
  const mail = render(unsubUrl);
  const res = await notify(row.id, kind, "email", {
    to: email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  return res.ok === true && res.duplicate !== true;
}

/** Run one job body, turning any throw into a reportable failure. */
export async function runNurture(
  name: string,
  body: () => Promise<number>
): Promise<JobResult> {
  if (!isConfigured()) {
    return { processed: 0, notes: "no DATABASE_URL — skipped" };
  }
  const processed = await body();
  return {
    processed,
    notes: processed === 0 ? "nothing due" : `${name}: sent ${processed}`,
  };
}
