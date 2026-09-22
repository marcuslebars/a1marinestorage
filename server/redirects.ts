// A1 Marine Storage → A1 Marine Care redirect map.
//
// The storage brand is retired: the private/mobile shrink-wrap offer now lives
// on a1marinecare.ca, and this domain exists only to send its accumulated
// search equity and inbound links there. Every public page 301s to the
// closest matching Care page; anything we can't map goes to the shrink-wrap
// landing page rather than a dead 404.
//
// Deliberately NOT redirected:
//   • /api/unsubscribe — CASL: the one-click unsubscribe in already-sent reminder
//     emails must keep working.
//   • /api/*           — no UI reaches them anymore; leaving them mounted is
//     harmless and keeps the old quote-resume links from the PDFs answering
//     something sensible (the SPA route they'd land on redirects anyway).
//   • /robots.txt      — served so crawlers keep following the 301s.
//
// Query strings are preserved (utm_* from any ad or email that still points at
// this domain survives the hop).

export const CARE_ORIGIN = "https://a1marinecare.ca";

const LANDING = "/shrink-wrapping";

/** Exact path → Care path. Trailing slashes are normalised before lookup. */
export const EXACT_REDIRECTS: Record<string, string> = {
  "/": LANDING,
  "/shrink-wrapping": LANDING,
  "/winter-quote": LANDING,
  "/calculator": LANDING,
  "/pricing": LANDING,
  "/services": LANDING,
  "/boat-storage": LANDING,
  "/winterization": LANDING,
  "/facility": LANDING,
  "/about": "/",
  "/faq": `${LANDING}#faq`,
  "/contact": "/contact",
  "/privacy": "/",
  "/terms": "https://a1marine.ca/terms",
  "/sitemap.xml": "/sitemap.xml",
};

/**
 * Storage localities → Care location slugs. The two sites never shared a
 * town list: Care's is lake-and-region based, Storage's was tow-radius based.
 * Towns Care doesn't have a page for map to the Georgian Bay page — every one
 * of them is on that shore.
 */
export const LOCALITY_REDIRECTS: Record<string, string> = {
  midland: "midland",
  penetanguishene: "penetanguishene",
  "honey-harbour": "honey-harbour",
  orillia: "orillia",
  barrie: "barrie",
  tiny: "georgian-bay",
  "wasaga-beach": "georgian-bay",
  "victoria-harbour": "georgian-bay",
  "port-mcnicoll": "georgian-bay",
  lafontaine: "georgian-bay",
  "balm-beach": "georgian-bay",
  waubaushene: "port-severn",
  coldwater: "port-severn",
};

const PASSTHROUGH_PREFIXES = ["/api/"];
const PASSTHROUGH_EXACT = new Set(["/robots.txt"]);

function normalize(path: string): string {
  if (!path) return "/";
  let p = path.split("?")[0].split("#")[0];
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return p || "/";
}

/**
 * The absolute URL a request for `path` should 301 to, or null if the request
 * should be served by this server (API, robots.txt).
 */
export function redirectTargetFor(path: string, search = ""): string | null {
  const p = normalize(path);
  if (PASSTHROUGH_EXACT.has(p)) return null;
  if (PASSTHROUGH_PREFIXES.some((prefix) => p.startsWith(prefix))) return null;

  let target: string | undefined = EXACT_REDIRECTS[p];

  if (!target) {
    const locality = p.match(/^\/boat-storage\/([a-z0-9-]+)$/)?.[1];
    if (locality) {
      const careSlug = LOCALITY_REDIRECTS[locality];
      target = careSlug ? `${LANDING}/${careSlug}` : LANDING;
    }
  }

  if (!target) target = LANDING;

  const absolute = target.startsWith("http") ? target : `${CARE_ORIGIN}${target}`;
  if (!search) return absolute;

  const qs = search.startsWith("?") ? search : `?${search}`;
  // Put the query before any #fragment.
  const hash = absolute.indexOf("#");
  return hash === -1 ? `${absolute}${qs}` : `${absolute.slice(0, hash)}${qs}${absolute.slice(hash)}`;
}
