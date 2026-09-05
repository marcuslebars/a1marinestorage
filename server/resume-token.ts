// Resume tokens — the "pick your quote back up" link printed in the PDF.
//
// SELF-CONTAINED AND SIGNED, not an opaque key into server-side state.
//
// The token was specified as "token, not query params", and this honours that:
// the customer sees one opaque parameter, not a readable dump of their
// selections. But it carries its own payload rather than pointing at a row,
// because this repo has NO PERSISTENT DATASTORE — logDir() is best-effort local
// JSONL and Railway's filesystem does not survive a redeploy. A key-into-storage
// token would produce resume links inside 30-day-valid PDFs that break on the
// next deploy, which is worse than a slightly longer URL.
//
// Signed with HMAC-SHA256 so the payload cannot be edited into a cheaper quote:
// the state is only a SELECTION (which services, which band), never a price —
// prices are always recomputed from the engine on the way back in — but a
// tampered band would still misprice, so the signature matters.
import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";

/** Quotes are valid 30 days; the link should not outlive the price by much. */
export const RESUME_TOKEN_TTL_MS = 45 * 24 * 60 * 60 * 1000;

export class ResumeTokenError extends Error {
  constructor(
    message: string,
    readonly code: "malformed" | "bad_signature" | "expired"
  ) {
    super(message);
    this.name = "ResumeTokenError";
  }
}

function secret(): string {
  // Falls back to a per-process constant in dev so the feature works locally
  // without setup. In production the fallback is a PUBLISHED string in a public
  // repo, so anyone could mint a token — see assertResumeSecret().
  return process.env.RESUME_TOKEN_SECRET ?? "a1ms-dev-resume-secret";
}

/**
 * Say something at boot when production is running on the dev fallback.
 *
 * Not a throw. A missing secret does not break resume links — they verify fine
 * against the fallback — so refusing to boot over it would take the whole site
 * down to protect a feature that still works. But the fallback is a constant in
 * a public repository, which means a tampered token would verify, and the quote
 * links printed on PDFs stay valid for 45 days. This must be loud.
 */
export function assertResumeSecret(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.RESUME_TOKEN_SECRET) return;
  console.error(
    "[resume-token] RESUME_TOKEN_SECRET is not set in production — falling back to the " +
      "public dev constant. Resume tokens are effectively unsigned: anyone can mint one. " +
      "Set RESUME_TOKEN_SECRET in Railway."
  );
}

const b64url = {
  encode: (buf: Buffer) => buf.toString("base64url"),
  decode: (s: string) => Buffer.from(s, "base64url"),
};

function sign(payload: string): string {
  return createHmac("sha256", secret())
    .update(payload)
    .digest("base64url")
    .slice(0, 27);
}

export interface ResumeState {
  /** Whatever the calculator needs to restore itself. Selection only, never money. */
  selection: unknown;
  boat: unknown;
  /** Issued-at, ms since epoch. */
  iat: number;
  /** Quote reference, so a resumed quote keeps the number printed on the PDF. */
  ref?: string;
}

/** Encode state into one opaque, signed, URL-safe token. */
export function encodeResumeToken(
  state: Omit<ResumeState, "iat"> & { iat?: number }
): string {
  const full: ResumeState = { ...state, iat: state.iat ?? Date.now() };
  // Deflate first: the selection JSON is repetitive, and this is what keeps the
  // link short enough to sit in a PDF without wrapping.
  const body = b64url.encode(
    deflateSync(Buffer.from(JSON.stringify(full), "utf8"))
  );
  return `${body}.${sign(body)}`;
}

/**
 * Verify the SIGNATURE and read the payload, ignoring age.
 *
 * Expiry and authenticity are different questions. A 46-day-old token is still
 * proof that we issued it — only its PRICES are stale, and prices are recomputed
 * from the engine on every path anyway. Separating the two is what lets an
 * expired link still prefill the customer's boat instead of handing back an
 * empty form and making them retype it.
 *
 * Still throws on a bad signature or an unreadable body: this relaxes the clock,
 * nothing else.
 */
export function decodeResumeTokenIgnoringAge(token: string): ResumeState {
  // "Now" is the epoch, so every token was issued in the future and none has
  // aged. Every other check — signature, readability, shape — still runs.
  return decodeResumeToken(token, 0);
}

/** Verify and decode. Throws rather than returning a partially-trusted state. */
export function decodeResumeToken(
  token: string,
  now = Date.now()
): ResumeState {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new ResumeTokenError("Malformed resume token.", "malformed");
  }
  const [body, given] = parts;

  const expected = sign(body);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a length mismatch.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ResumeTokenError(
      "Resume token signature does not match.",
      "bad_signature"
    );
  }

  let state: ResumeState;
  try {
    state = JSON.parse(
      inflateSync(b64url.decode(body)).toString("utf8")
    ) as ResumeState;
  } catch {
    // Signature passed but the body is unreadable — corrupted in transit, or a
    // token from an older payload format.
    throw new ResumeTokenError("Resume token could not be read.", "malformed");
  }

  if (typeof state?.iat !== "number") {
    throw new ResumeTokenError("Resume token has no issue time.", "malformed");
  }
  if (now - state.iat > RESUME_TOKEN_TTL_MS) {
    throw new ResumeTokenError("This quote link has expired.", "expired");
  }
  return state;
}

/** The customer-facing resume URL for a token. */
export function resumeUrlFor(token: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/calculator?q=${encodeURIComponent(token)}`;
}
