// A1 Marine Storage — schema.org JSON-LD builders (plain objects, no deps).
// Server-injected into the initial HTML and applied client-side on navigation,
// so rich-result eligibility doesn't depend on the SPA's JS running.
import { BUSINESS, SERVICE_AREA } from "./business";

type Json = Record<string, unknown>;

const ORIGIN = BUSINESS.url;
const BUSINESS_ID = `${ORIGIN}/#business`;

const areaServed = () => SERVICE_AREA.map((name) => ({ "@type": "City", name }));

/** LocalBusiness (homepage) — real NAP, hours, service area, priceRange. */
export function localBusinessLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": BUSINESS_ID,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: ORIGIN,
    telephone: BUSINESS.phoneHref.replace("tel:", ""),
    email: BUSINESS.email,
    image: `${ORIGIN}/og-image.png`,
    logo: `${ORIGIN}/a1-marine-storage-logo.png`,
    priceRange: BUSINESS.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.country,
    },
    areaServed: areaServed(),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: BUSINESS.hours.days,
        opens: BUSINESS.hours.opens,
        closes: BUSINESS.hours.closes,
      },
    ],
    // Umbrella brand — helps entity association.
    sameAs: ["https://a1marine.ca"],
  };
}

/** WebSite (homepage) — establishes the site name for search. */
export function webSiteLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${ORIGIN}/#website`,
    url: ORIGIN,
    name: BUSINESS.name,
    publisher: { "@id": BUSINESS_ID },
  };
}

/** Service schema (service + locality pages). `provider` references the LocalBusiness node. */
export function serviceLd(input: {
  name: string;
  description: string;
  path: string;
  serviceType: string;
  /** Optional single-city override (locality pages); defaults to the full service area. */
  areaServedCity?: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    serviceType: input.serviceType,
    url: `${ORIGIN}${input.path}`,
    provider: { "@id": BUSINESS_ID },
    areaServed: input.areaServedCity
      ? { "@type": "City", name: input.areaServedCity }
      : areaServed(),
  };
}

/** FAQPage schema from Q&A pairs. */
export function faqPageLd(items: readonly { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

/** BreadcrumbList from {name, path} crumbs (deep pages). */
export function breadcrumbLd(crumbs: readonly { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${ORIGIN}${c.path === "/" ? "" : c.path}`,
    })),
  };
}
