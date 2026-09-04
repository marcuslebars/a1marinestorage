// Cloudflare Turnstile, invisible mode.
//
// UNSET MEANS OFF, completely — no network call, no failure path. Local dev and
// tests must not need a Cloudflare account, and a half-configured deploy must
// not start rejecting real customers.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET);
}

/**
 * Verify a token. Returns true when Turnstile is disabled.
 *
 * FAILS OPEN on a network error: Cloudflare being unreachable must not stop the
 * yard taking bookings. The honeypot and rate limits are the other two layers,
 * and losing one of three to an outage is the right trade against losing every
 * lead for the duration.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string
): Promise<boolean> {
  if (!isTurnstileEnabled()) return true;
  if (!token) return false;

  try {
    const form = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET as string,
      response: token,
    });
    if (ip) form.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(4000),
    });
    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
    } | null;
    return data?.success === true;
  } catch (err) {
    console.error(
      "[turnstile] verification unreachable, allowing:",
      err instanceof Error ? err.message : err
    );
    return true;
  }
}
