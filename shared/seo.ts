// A1 Marine Storage — per-route SEO registry (single source of truth).
//
// Consumed by BOTH:
//   • the Express server (injectMeta) — rewrites the initial index.html <head> so
//     crawlers and social scrapers get real per-page title/description/canonical/
//     OG + JSON-LD with zero JS, and
//   • the client (usePageMeta hook) — applies the same on SPA navigation.
// Also generates /sitemap.xml. Dependency-free (bundles under Vite AND esbuild).
//
// Pricing note: meta strings intentionally quote NO dollar figures — rates live
// in @a1/pricing-engine and are rendered on-page from there. Keeping numbers out
// of this file avoids both hardcoding and staleness.
import { localBusinessLd, webSiteLd, serviceLd, faqPageLd, breadcrumbLd } from "./structured-data";
import { LOCALITIES, localityFaq, type Locality } from "./localities";

export const SITE = {
  origin: "https://a1marinestorage.ca",
  name: "A1 Marine Storage",
  defaultOgImage: "https://a1marinestorage.ca/og-image.png",
  defaultDescription:
    "Secure seasonal boat storage, shrink wrapping, and winterization in Tiny, Ontario — serving Georgian Bay and Lake Simcoe.",
} as const;

export interface PageMeta {
  /** Normalized path, no trailing slash except "/". */
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  /** Keep out of the generated sitemap (ad landing pages, utility routes). */
  sitemapExclude?: boolean;
}

// ── Site-wide FAQ (feeds /faq page AND its FAQPage JSON-LD) ───────────────────
export const SITE_FAQ: readonly { q: string; a: string }[] = [
  {
    q: "When does the storage season run?",
    a: "Our storage season runs from fall haul-out through spring launch. Drop-off and pickup are scheduled by appointment — reserve early, as space on the lot is limited each winter.",
  },
  {
    q: "Where is your storage yard?",
    a: "We're at 639 Concession Road 16 East in Tiny, Ontario — minutes from Georgian Bay and central to Midland, Penetanguishene, Wasaga Beach, and the surrounding area.",
  },
  {
    q: "Is the facility secure?",
    a: "Yes. The lot is fenced and gated with controlled access (by appointment or access code) and is monitored throughout the winter.",
  },
  {
    q: "Can I access my boat during the winter?",
    a: "Yes — by appointment during business hours (Monday to Friday, 9 AM to 6 PM). Contact us ahead of time and we'll arrange access.",
  },
  {
    q: "Do I need my own insurance?",
    a: "Yes. Storage, shrink wrapping, and winterization are services, not insurance — please keep your own comprehensive coverage on the boat, trailer, and contents while it is in our care.",
  },
  {
    q: "What does winterization include?",
    a: "Depending on your engine type, winterization covers engine flush and fogging, antifreeze in the engine and lines, fuel stabilizer, battery disconnect, and drain-plug removal. Disclose all onboard water systems so nothing is missed.",
  },
  {
    q: "How is pricing calculated?",
    a: "Storage and shrink wrapping are priced per foot (with a minimum); winterization is a flat rate by engine type. Bundle storage, wrap, and winterizing to save. Use our calculator for an instant estimate.",
  },
  {
    q: "Is shrink wrap better than a tarp?",
    a: "Yes. Heat-shrink film is installed tight over a vented support frame, so it sheds snow and resists wind far better than a loose tarp — protecting your boat from moisture, UV, and debris.",
  },
];

// ── Static route registry ────────────────────────────────────────────────────
const STATIC_PAGES: PageMeta[] = [
  {
    path: "/",
    title: "A1 Marine Storage — Boat Storage, Shrink Wrapping & Winterization | Tiny, ON",
    description:
      "Secure seasonal boat storage, professional shrink wrapping, and full winterization at our gated Tiny, Ontario yard. Serving Georgian Bay & Lake Simcoe. Get an instant quote.",
    jsonLd: [localBusinessLd(), webSiteLd()],
    changefreq: "weekly",
    priority: 1.0,
  },
  {
    path: "/boat-storage",
    title: "Outdoor Boat Storage in Tiny, Ontario | A1 Marine Storage",
    description:
      "Secure, gated outdoor boat storage on our fenced lot in Tiny, Ontario. Professionally blocked on your trailer and monitored all winter, with planned spring access.",
    jsonLd: [
      serviceLd({
        name: "Outdoor Boat Storage",
        description:
          "Secure seasonal outdoor boat storage on a fenced, monitored lot in Tiny, Ontario, serving the Georgian Bay area.",
        path: "/boat-storage",
        serviceType: "Boat storage",
      }),
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Boat Storage", path: "/boat-storage" },
      ]),
    ],
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/shrink-wrapping",
    title: "Boat Shrink Wrapping in Tiny, Ontario | A1 Marine Storage",
    description:
      "Professional heat-shrink boat wrapping with a vented, framed installation that sheds snow and blocks UV all winter. Serving Georgian Bay, Midland & Penetanguishene.",
    jsonLd: [
      serviceLd({
        name: "Boat Shrink Wrapping",
        description:
          "Professional heat-shrink boat wrapping with vented support framing, protecting boats through the Georgian Bay winter.",
        path: "/shrink-wrapping",
        serviceType: "Boat shrink wrapping",
      }),
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Shrink Wrapping", path: "/shrink-wrapping" },
      ]),
    ],
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/winterization",
    title: "Boat Winterization in Tiny, Ontario | A1 Marine Storage",
    description:
      "Complete boat winterization — engine fogging, antifreeze, fuel stabilizer, and battery disconnect for outboard, sterndrive, and inboard engines. Georgian Bay & Lake Simcoe.",
    jsonLd: [
      serviceLd({
        name: "Boat Winterization",
        description:
          "Full boat winterization for outboard, sterndrive, and inboard engines, serving the Georgian Bay and Lake Simcoe area.",
        path: "/winterization",
        serviceType: "Boat winterization",
      }),
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Winterization", path: "/winterization" },
      ]),
    ],
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/services",
    title: "Boat Storage Services — Storage, Wrap & Winterizing | A1 Marine Storage",
    description:
      "Complete seasonal boat care from fall haul-out to spring launch: outdoor storage, shrink wrapping, winterization, and spring commissioning in Tiny, Ontario.",
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    path: "/pricing",
    title: "Boat Storage & Winterization Pricing | A1 Marine Storage",
    description:
      "Transparent, per-foot boat storage, shrink wrapping, and winterization pricing for the Georgian Bay area. Bundle and save — get an instant, no-obligation quote.",
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/calculator",
    title: "Instant Boat Storage Quote Calculator | A1 Marine Storage",
    description:
      "Estimate your seasonal storage, shrink wrapping, and winterization in under two minutes with our instant quote calculator. Tiny, Ontario — Georgian Bay area.",
    changefreq: "monthly",
    priority: 0.9,
  },
  {
    path: "/facility",
    title: "Our Boat Storage Facility — 639 Concession Rd 16 E, Tiny ON",
    description:
      "Tour A1 Marine Storage's secure, gated boat storage facility in Tiny, Ontario — fenced, monitored, and purpose-built for Georgian Bay boat owners.",
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    path: "/about",
    title: "About A1 Marine Storage — Georgian Bay Boat Care",
    description:
      "A1 Marine Storage is the seasonal storage and winterizing division of A1 Marine Care, serving Georgian Bay and Lake Simcoe from Tiny, Ontario.",
    changefreq: "yearly",
    priority: 0.5,
  },
  {
    path: "/faq",
    title: "Boat Storage FAQ | A1 Marine Storage, Tiny ON",
    description:
      "Answers about seasonal boat storage, shrink wrapping, winterization, access, insurance, and pricing at A1 Marine Storage in Tiny, Ontario.",
    jsonLd: [
      faqPageLd(SITE_FAQ),
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "FAQ", path: "/faq" },
      ]),
    ],
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    path: "/contact",
    title: "Contact A1 Marine Storage | Tiny, Ontario",
    description:
      "Questions about boat storage availability, pricing, or booking in the Georgian Bay area? Contact A1 Marine Storage in Tiny, Ontario.",
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    path: "/winter-quote",
    title: "Winter Boat Storage Quote | A1 Marine Storage",
    description:
      "Lock in secure winter boat storage, shrink wrapping, and winterization for the Georgian Bay area. Get your fast, no-obligation quote from A1 Marine Storage.",
    // Meta-ads destination — indexable/self-canonical but kept out of the sitemap.
    sitemapExclude: true,
  },
  {
    path: "/privacy",
    title: "Privacy Policy | A1 Marine Storage",
    description: "How A1 Marine Storage collects, uses, and protects your information.",
    changefreq: "yearly",
    priority: 0.3,
  },
];

// Mutable page list — Phase 2 appends locality pages via `registerPages`.
const PAGES: PageMeta[] = [...STATIC_PAGES];

/**
 * Register additional pages (e.g. the locality set) into the registry so both
 * getPageMeta() and the sitemap pick them up. Idempotent by path. Must be
 * imported by BOTH the client (App) and the server before use.
 */
export function registerPages(pages: PageMeta[]): void {
  for (const p of pages) {
    const norm = normalizePath(p.path);
    if (!PAGES.some((x) => x.path === norm)) PAGES.push({ ...p, path: norm });
  }
}

// ── Path resolution ──────────────────────────────────────────────────────────
export function normalizePath(input: string): string {
  let p = (input || "/").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

export function canonicalUrl(path: string): string {
  const p = normalizePath(path);
  return `${SITE.origin}${p === "/" ? "/" : p}`;
}

/** Resolve per-route meta; unknown routes → noindex default (the 404). */
export function getPageMeta(path: string): PageMeta {
  const norm = normalizePath(path);
  const hit = PAGES.find((p) => p.path === norm);
  if (hit) return hit;
  return {
    path: norm,
    title: `Page Not Found | ${SITE.name}`,
    description: SITE.defaultDescription,
    noindex: true,
    sitemapExclude: true,
  };
}

/** True if `path` is a registered route (vs. an unknown/404 path). */
export function hasPage(path: string): boolean {
  return PAGES.some((p) => p.path === normalizePath(path));
}

// ── Server-side <head> injection ─────────────────────────────────────────────
function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function jsonForScript(obj: unknown): string {
  // Escape "<" so a "</script>" inside string data can't break out.
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
// Function replacements throughout: the injected values (titles, JSON-LD with a
// "$$" priceRange, etc.) can contain "$", which String.replace would otherwise
// interpret as $1/$&/$$ patterns and corrupt.
function setMetaContent(html: string, attr: "name" | "property", key: string, value: string): string {
  const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
  return re.test(html) ? html.replace(re, (_m, p1: string, p2: string) => `${p1}${escAttr(value)}${p2}`) : html;
}

/** Rewrite the base index.html head for a given route. Pure string transform. */
export function injectMeta(html: string, meta: PageMeta): string {
  const canonical = canonicalUrl(meta.path);
  const ogTitle = meta.ogTitle ?? meta.title;
  const ogDesc = meta.ogDescription ?? meta.description;
  const ogImage = meta.ogImage ?? SITE.defaultOgImage;

  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escAttr(meta.title)}</title>`);
  out = setMetaContent(out, "name", "description", meta.description);
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, (_m, p1: string, p2: string) => `${p1}${canonical}${p2}`);
  out = setMetaContent(out, "property", "og:title", ogTitle);
  out = setMetaContent(out, "property", "og:description", ogDesc);
  out = setMetaContent(out, "property", "og:url", canonical);
  out = setMetaContent(out, "property", "og:image", ogImage);
  out = setMetaContent(out, "name", "twitter:title", ogTitle);
  out = setMetaContent(out, "name", "twitter:description", ogDesc);
  out = setMetaContent(out, "name", "twitter:image", ogImage);

  const inject: string[] = [];
  if (meta.noindex) inject.push(`<meta name="robots" content="noindex, follow" />`);
  for (const obj of meta.jsonLd ?? []) {
    inject.push(`<script type="application/ld+json">${jsonForScript(obj)}</script>`);
  }
  if (inject.length) {
    const block = `    ${inject.join("\n    ")}\n  </head>`;
    out = out.replace("</head>", () => block);
  }
  return out;
}

// ── Sitemap ──────────────────────────────────────────────────────────────────
export function sitemapPages(): PageMeta[] {
  return PAGES.filter((p) => !p.sitemapExclude && !p.noindex);
}

export function renderSitemap(): string {
  const urls = sitemapPages()
    .map((p) => {
      const loc = canonicalUrl(p.path);
      const cf = p.changefreq ?? "monthly";
      const pr = (p.priority ?? 0.5).toFixed(1);
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// ── Locality pages (Phase 2) — registered from the shared localities config so
//    getPageMeta(), the server injection, and the sitemap all pick them up. ─────
function localityPageMeta(loc: Locality): PageMeta {
  const path = `/boat-storage/${loc.slug}`;
  return {
    path,
    title: `Boat Storage & Shrink Wrapping in ${loc.name}, ON | A1 Marine Storage`,
    description: `Secure winter boat storage, shrink wrapping, and winterization for ${loc.name} boaters — about ${loc.driveMin} minutes from our fenced Tiny, Ontario yard. Serving ${loc.waters}.`,
    jsonLd: [
      localBusinessLd(),
      serviceLd({
        name: `Boat Storage & Shrink Wrapping in ${loc.name}`,
        description: `Seasonal boat storage, shrink wrapping, and winterization for ${loc.name}, Ontario and ${loc.waters}.`,
        path,
        serviceType: "Boat storage and winterization",
        areaServedCity: loc.name,
      }),
      faqPageLd(localityFaq(loc)),
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Boat Storage", path: "/boat-storage" },
        { name: loc.name, path },
      ]),
    ],
    changefreq: "monthly",
    priority: 0.7,
  };
}

registerPages(LOCALITIES.map(localityPageMeta));
