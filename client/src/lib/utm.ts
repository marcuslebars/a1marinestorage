// Ad / campaign attribution capture (utm_*, gclid, fbclid).
//
// Captured on first load and stored in sessionStorage so it survives SPA
// navigation (a visitor lands on /winter-quote?utm_source=meta..., browses, then
// submits from another route). Lead submissions attach it as `meta.utm`, which
// the server threads into the canonical lead envelope for EmpireVu.
const KEY = "a1ms_attribution";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export type Attribution = Record<string, string>;

/** Read utm_ params, gclid, and fbclid from the current URL and persist (first-touch wins). */
export function captureUtm(): void {
  try {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const captured: Attribution = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) captured[k] = v.slice(0, 200);
    }
    const gclid = params.get("gclid");
    if (gclid) captured.gclid = gclid.slice(0, 200);
    const fbclid = params.get("fbclid");
    if (fbclid) captured.fbclid = fbclid.slice(0, 200);

    if (Object.keys(captured).length === 0) return; // nothing to capture on this URL
    if (sessionStorage.getItem(KEY)) return; // first touch of the session wins

    captured.landing_page = window.location.pathname;
    if (document.referrer) captured.referrer = document.referrer.slice(0, 300);
    sessionStorage.setItem(KEY, JSON.stringify(captured));
  } catch {
    /* attribution is best-effort — never block the app */
  }
}

/** The captured attribution for this session, or undefined if none. */
export function getUtm(): Attribution | undefined {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return undefined;
    const obj = JSON.parse(raw) as Attribution;
    return obj && Object.keys(obj).length ? obj : undefined;
  } catch {
    return undefined;
  }
}
