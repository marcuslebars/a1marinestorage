// A1 Marine Storage — Meta (Facebook) Pixel.
//
// The pixel ID is a PUBLIC, client-side id (like the GA4 measurement id). It defaults to
// the A1 Marine Storage pixel and can be overridden with VITE_META_PIXEL_ID.
//
// SPA-aware, exactly like the GA4 module (see analytics.ts): init once at startup, then
// fire PageView on every route change (called from App.tsx) — the raw pixel snippet only
// fires PageView on the first load and would miss all client-side navigation.
//
// Only initialised in PRODUCTION builds, so local dev / `build:dev` never pollute the
// pixel with test traffic (import.meta.env.PROD is a compile-time constant, so the body
// is tree-shaken out of dev builds).
const PIXEL_ID =
  (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() || "2437586250097446";

interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: unknown;
  loaded: boolean;
  version: string;
}

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let ready = false;

/** Inject fbevents.js once and init the pixel. Call once at startup. No-op in dev. */
export function initMetaPixel(): void {
  if (ready || typeof window === "undefined" || !PIXEL_ID || !import.meta.env.PROD) return;

  if (!window.fbq) {
    // Standard Meta bootstrap: a queueing stub until fbevents.js loads and replays it.
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    window.fbq = fbq;
    window._fbq = window._fbq ?? fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq?.("init", PIXEL_ID);
  // PageView is fired from trackPixelPageView() on each route change (incl. the first).
  ready = true;
}

/** SPA PageView — call on every route change. No-op until initialised. */
export function trackPixelPageView(): void {
  if (!ready || !window.fbq) return;
  window.fbq("track", "PageView");
}

/** Fire a Meta standard/custom event (e.g. "Lead"). No-op until initialised. NEVER pass PII. */
export function trackPixelEvent(event: string, params?: Record<string, unknown>): void {
  if (!ready || !window.fbq) return;
  window.fbq("track", event, params ?? {});
}

/** True once the pixel is initialised. */
export function metaPixelEnabled(): boolean {
  return ready;
}
