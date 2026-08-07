# A1 Marine Storage — SEO Audit & Punch List

_Branch: `feat/seo-locality-jobber` · Audited against `main` @ c2b2380 · a1marinestorage.ca_

This is Phase 1 deliverable #1: the current-state audit and the prioritized punch list I'll implement. Pricing figures on every page are already engine-derived (`client/src/lib/storage-pricing.ts` → `@a1/pricing-engine#v1.2.0`) — nothing here hardcodes a price.

## 1. Current routes & on-page SEO

The site is a **client-rendered Vite SPA** (wouter router). There is **no per-page `<title>`/meta mechanism** — every route inherits the single `client/index.html` head. So the `Title`/`Meta description` columns below are *identical on every indexable route*, and the `<link rel="canonical">` points at the **homepage** on every route.

| Route | Purpose | Effective `<title>` | Effective meta description | H1 | Canonical | Indexable |
|---|---|---|---|---|---|---|
| `/` | Homepage | `A1 Marine Storage — Secure Seasonal Boat Storage & Shrink Wrapping \| Tiny, ON` | (home copy) | "Your Boat Deserves a Safe Winter." | → `/` ✓ | Yes |
| `/services` | Combined services overview | **same as home (dup)** | **dup** | "Our Storage Services" | → `/` ✗ | Yes |
| `/pricing` | Pricing tables (engine-derived) | **dup** | **dup** | "Straightforward storage pricing. No surprises in spring." | → `/` ✗ | Yes |
| `/calculator` | Interactive quote + lead form | **dup** | **dup** | "Storage Quote Calculator" | → `/` ✗ | Yes |
| `/facility` | Facility / location / hours | **dup** | **dup** | "639 Concession Road 16 East" | → `/` ✗ | Yes |
| `/contact` | Contact form | **dup** | **dup** | "Contact A1 Marine Storage" | → `/` ✗ | Yes |
| `/privacy` | Privacy policy | **dup** | **dup** | "Privacy Policy" | → `/` ✗ | Yes |
| `/terms` | 301 → `a1marine.ca/terms` | n/a | n/a | n/a | n/a | 301 (correct) |
| `/404`, `*` | Not found | **dup** | **dup** | "404 — Page Not Found" | → `/` ✗ | Yes (should be noindex) |

**Headline problems:** (a) duplicate title/description sitewide, (b) every page canonicalizes to the homepage — Google will likely drop or merge `/services`, `/pricing`, etc.

## 2. Missing pages (local-service-site checklist)

| Expected | Status | Notes |
|---|---|---|
| `/boat-storage` (own page) | ❌ Missing | Only a combined `/services` + `#outdoor-storage` anchor exists |
| `/shrink-wrapping` (own page) | ❌ Missing | `#shrink-wrapping` anchor only |
| `/winterization` (own page) | ❌ Missing | `#winterization` anchor only |
| `/pricing` | ✅ Present | Engine-derived; links to `/calculator`. Add the live widget inline (P1) |
| `/faq` | ❌ Missing | Needed + `FAQPage` JSON-LD |
| `/about` | ❌ Missing | Some "about" copy lives on `/facility`; no dedicated page |
| `/contact` | ✅ Present | — |
| `/winter-quote` (Meta-ads LP) | ❌ Missing | Must exist + capture UTM into the lead envelope |
| Privacy | ✅ `/privacy` | — |
| Terms | ✅ `/terms` → umbrella 301 | Correct (canonical terms live on a1marine.ca) |

> UTM note: the quote envelope builder (`buildStorageQuoteEnvelope`) already accepts `utm`, but nothing currently reads `?utm_*` off the URL and threads it through. `/winter-quote` must close that loop.

## 3. Technical SEO

| Item | State | Action |
|---|---|---|
| `sitemap.xml` | Static file, 7 URLs, no service/locality pages | Generate from a route registry (Express route) |
| `robots.txt` | ✅ OK (allows all, references sitemap) | Keep |
| Canonical tags | ✗ All → homepage | Per-page self-canonical |
| OG / Twitter | Base tags present, but identical on all routes | Per-page OG title/description/url |
| `LocalBusiness` JSON-LD | ❌ None | Add on homepage (real NAP, hours, geo, areaServed, priceRange) |
| `Service` / `FAQPage` / `Breadcrumb` JSON-LD | ❌ None | Add to service, FAQ, and (Phase 2) locality pages |
| Per-page titles/descriptions | ❌ None (all dup) | Route registry (below) |
| Viewport | `maximum-scale=1` set | Remove — it blocks pinch-zoom (mobile-usability/a11y flag) |
| Image alt text | Mostly good (hero, facility descriptive) | Keep; ensure new pages follow suit |
| Heading hierarchy | `/contact` + `/calculator` each declare two `<h1>` (conditional success/form states) | Demote success-state headings to `<h2>` |

## 4. Proposed fix architecture (the foundation)

Because crawlers and social scrapers don't reliably execute the SPA's JS, per-page `<title>/meta/canonical/JSON-LD` must be in the **initial HTML**. Plan:

- **`client/src/lib/seo.ts`** — a single route→meta registry (`title`, `description`, `canonical`, `og`, `jsonLd[]`), shared by client and server.
- **Server injection** — replace the blind `app.get("*")` sendFile with a handler that reads `index.html` and injects the matched route's meta + JSON-LD before serving. This is what Google/Facebook/etc. see with zero JS.
- **`usePageMeta()` hook** — updates the same tags on client-side SPA navigation (tab title, etc.).
- **Generated `/sitemap.xml`** — Express route built from the registry (so adding a page/locality updates the sitemap automatically). The static file is removed.

This foundation is also what makes Phase 2's locality pages rank-ready (unique server-rendered meta per town).

## 5. Prioritized punch list

**P0 — SEO-critical**
1. Route→meta registry + server-side meta injection + `usePageMeta` hook (fixes duplicate titles/descriptions **and** the canonical-to-home bug).
2. `LocalBusiness` JSON-LD on the homepage (NAP: A1 Marine Storage, 639 Concession Road 16 E, Tiny, ON L9M 1R2; hours Mo–Fr 09:00–18:00; `areaServed`; `priceRange`; geo).
3. Generated `/sitemap.xml` route incl. every real page.
4. Individual service pages `/boat-storage`, `/shrink-wrapping`, `/winterization` — unique meta, engine-derived pricing, `Service` JSON-LD, internal links.

**P1 — important**
5. `/faq` (+ `FAQPage` JSON-LD) and `/about`.
6. `/winter-quote` Meta-ads landing page — reads `?utm_*`, threads it into the quote lead envelope; verify end-to-end.
7. Per-page OG/Twitter via the registry.
8. Remove `maximum-scale=1`; `noindex` the 404.

**P2 — polish**
9. Single `<h1>` per page (success states → `<h2>`).
10. `BreadcrumbList` JSON-LD on service/locality pages.
11. Homepage H1 keyword support (see decisions).

## 6. Decisions for the owner

- **Business hours (schema):** Mon–Fri 9:00 AM–6:00 PM, by appointment — taken verbatim from the live `/facility` page, so I'll use it. Flag if wrong.
- **`priceRange` (schema):** I'll use `"$$"` (conventional, non-committal). Alternative: an explicit "$375–$3,000+" band. Say if you prefer the explicit band.
- **Homepage H1:** "Your Boat Deserves a Safe Winter." is a strong brand hero. Per our rule that copy changes are your call, I will **not** rewrite it — I'll add keyword-anchored supporting text and rely on the new per-page titles. Tell me if you want a more literal H1 ("Boat Storage & Winterization in Tiny, ON").
- **`/about`:** I'll ship a lean dedicated `/about` that links to `/facility` (rather than folding about-copy into facility), for the internal-link + entity signal.
