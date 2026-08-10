// A1 Marine Storage — GA4 + optional Google Ads (gtag.js).
//
// IDs come from PUBLIC, build-time Vite env vars. These are client-side IDs by
// design — never put a server secret behind a VITE_ var:
//   VITE_GA4_MEASUREMENT_ID  — GA4, e.g. "G-XXXXXXXXXX". Overrides the baked-in
//                              production default (G-Z629H2P6LQ).
//   VITE_GOOGLE_ADS_ID       — Google Ads, e.g. "AW-XXXXXXXXX" (optional; loaded
//                              alongside GA4 so enhanced conversions / Ads import
//                              is a config change later, not a code change)
//   VITE_GA4_DEBUG=true       — enable gtag debug_mode for GA4 DebugView
//
// In production the default id ensures GA4 always loads. In dev (no env var) NOTHING
// is injected and every track() call is a silent no-op — no console errors.
//
// PII RULE: never pass names, emails, or phone numbers as event params.

// Defaults to the A1 Marine Storage property in production builds so analytics can't
// silently break if the env var is ever cleared; VITE_GA4_MEASUREMENT_ID overrides it,
// and dev stays clean (no id unless the var is explicitly set).
const GA4_ID =
  (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined)?.trim() ||
  (import.meta.env.PROD ? "G-Z629H2P6LQ" : undefined);
const ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;
const DEBUG = (import.meta.env.VITE_GA4_DEBUG as string | undefined) === "true";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let enabled = false;

/** Inject gtag.js once and configure GA4 (+ Google Ads if set). Call once at startup. */
export function initAnalytics(): void {
  if (enabled || !GA4_ID || typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  // Pre-load shim: queue calls until gtag.js loads. gtag.js replays each queued
  // entry as an argument list (arrays work the same as the classic `arguments`).
  window.gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };

  window.gtag("js", new Date());
  // SPA: suppress the automatic first page_view — we fire page_view on every
  // route change (including the first) from the router.
  const ga4Config: Record<string, unknown> = { send_page_view: false };
  if (DEBUG) ga4Config.debug_mode = true;
  window.gtag("config", GA4_ID, ga4Config);
  if (ADS_ID) window.gtag("config", ADS_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(script);

  enabled = true;
}

/** True once analytics is configured and initialised. */
export function analyticsEnabled(): boolean {
  return enabled;
}

/** Fire a GA4 event. No-op when disabled. NEVER pass PII (names/emails/phones). */
export function track(event: string, params?: Record<string, unknown>): void {
  if (!enabled || !window.gtag) return;
  window.gtag("event", event, params ?? {});
}

/** SPA page_view — call on each route change. */
export function trackPageView(path: string): void {
  if (!enabled || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/** Shared handler for any `tel:` link click. `location` = the component it lives in. */
export function trackPhoneClick(location: string): void {
  track("phone_click", { location });
}
