// One-click unsubscribe for the nurture emails.
//
// Reuses the resume-token HMAC with a DIFFERENT payload shape, so an
// unsubscribe link cannot be replayed as a resume link or the other way round:
// each decoder reads the field it needs and a token from the wrong family
// simply has no such field.
//
// Signed rather than a bare email in the URL, because an unsigned
// ?email=someone@example.com would let anyone unsubscribe anyone — including a
// competitor unsubscribing a yard's whole list from a log file.
//
// TRANSACTIONAL MAIL IS NOT AFFECTED. A quote confirmation, a PDF copy and a
// booking receipt are things the customer asked for; only the reminders we
// send on our own initiative honour this flag.
import { isConfigured, query } from "./db/index";
import { normalizeEmail } from "./normalize";
import { escapeHtml } from "./notify/templates/layout";
import {
  decodeResumeTokenIgnoringAge,
  encodeResumeToken,
} from "./resume-token";

/** Longer than the 45-day resume TTL: an unsubscribe link must not expire
 *  before the emails carrying it stop arriving. */
const UNSUB_TTL_MS = 400 * 24 * 60 * 60 * 1000;

export function encodeUnsubscribeToken(email: string): string {
  // `selection` carries the payload because the token format is shared; the
  // marker distinguishes the two families.
  return encodeResumeToken({
    selection: { unsub: normalizeEmail(email) },
    boat: null,
  });
}

export function decodeUnsubscribeToken(token: string): string | null {
  try {
    // Verify the SIGNATURE with the shared helper, then apply this token
    // family's own, much longer age limit. Passing a shifted `now` into
    // decodeResumeToken would work by arithmetic accident and read as a bug to
    // the next person; an explicit check says what the rule is.
    const state = decodeResumeTokenIgnoringAge(token);
    if (Date.now() - state.iat > UNSUB_TTL_MS) return null;
    const sel = state.selection as { unsub?: unknown } | null;
    const email = typeof sel?.unsub === "string" ? sel.unsub : "";
    return email ? normalizeEmail(email) : null;
  } catch {
    // A bad signature, an unreadable body, or a resume token that has no
    // `unsub` field: none of them identify anyone, so none of them unsubscribe
    // anyone.
    return null;
  }
}

export function unsubscribeUrl(email: string, origin: string): string {
  const token = encodeUnsubscribeToken(email);
  return `${origin.replace(/\/$/, "")}/api/unsubscribe?t=${encodeURIComponent(token)}`;
}

/**
 * Mark every row for this address as unsubscribed.
 *
 * The flag lives on the contact JSON rather than a separate table because it
 * has to be visible to anything reading a lead — a job that queries `quotes`
 * and joins nothing must still be able to see it.
 */
export async function unsubscribeEmail(email: string): Promise<boolean> {
  if (!isConfigured()) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  try {
    const res = await query(
      `update quotes
          set contact = jsonb_set(contact, '{unsubscribed}', 'true'::jsonb, true),
              updated_at = now()
        where lower(contact ->> 'email') = $1`,
      [normalized]
    );
    return res.ok;
  } catch (err) {
    console.error(
      "[unsubscribe] failed:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}

export interface UnsubscribeResult {
  status: number;
  /** HTML, because this is opened by a person clicking a link in an email. */
  body: string;
}

const PAGE = (title: string, message: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — A1 Marine Storage</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f4f6f8">
<div style="max-width:520px;margin:64px auto;padding:32px;background:#fff;border-radius:12px">
  <h1 style="margin:0 0 12px;font-size:22px;color:#111">${title}</h1>
  <p style="margin:0;font-size:15px;line-height:1.6;color:#444">${message}</p>
  <p style="margin:24px 0 0;font-size:13px;color:#777">
    A1 Marine Storage · <a href="https://a1marinestorage.ca" style="color:#DE3C37">a1marinestorage.ca</a>
  </p>
</div></body></html>`;

/**
 * Handle the click. ALWAYS answers 200 with a friendly page.
 *
 * A person who clicked "unsubscribe" wants to stop hearing from us; showing
 * them an error is both useless and infuriating. A bad token means we cannot
 * identify them, so the page tells them to reply to the email instead — which
 * a human will action — rather than leaving them to click again.
 */
export async function handleUnsubscribe(
  token: unknown
): Promise<UnsubscribeResult> {
  const email =
    typeof token === "string" ? decodeUnsubscribeToken(token) : null;
  if (!email) {
    return {
      status: 200,
      body: PAGE(
        "We couldn't read that link",
        "It may have been broken by your email client. Reply to any of our emails with “stop” and we'll take you off the list by hand."
      ),
    };
  }

  const ok = await unsubscribeEmail(email);
  return {
    status: 200,
    body: ok
      ? PAGE(
          "You're unsubscribed",
          `We won't send <strong>${escapeHtml(email)}</strong> any more reminders. You'll still get emails about a quote or booking you asked for.`
        )
      : PAGE(
          "We've noted that",
          `We couldn't reach our records just now, but reply to any of our emails with “stop” and we'll take <strong>${escapeHtml(email)}</strong> off the list.`
        ),
  };
}

/** True when this address has opted out of reminders. */
export function isUnsubscribed(contact: unknown): boolean {
  return (
    typeof contact === "object" &&
    contact !== null &&
    (contact as { unsubscribed?: unknown }).unsubscribed === true
  );
}
