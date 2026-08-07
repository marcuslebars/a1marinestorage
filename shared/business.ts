// A1 Marine Storage — canonical business / NAP data (single source of truth).
//
// Lives in `shared/` so BOTH the client (pages, structured data) and the server
// (initial-HTML JSON-LD injection) read the exact same name/address/phone. The
// client re-exports this as `@/content/business` for existing import sites.
export const BUSINESS = {
  name: "A1 Marine Storage",
  legalName: "Thinker Holdings Inc.", // registered entity, operating as A1 Marine Storage
  url: "https://a1marinestorage.ca",
  phone: "(249) 201-6677",
  phoneHref: "tel:+12492016677",
  email: "contact@a1marinestorage.ca",
  emailHref: "mailto:contact@a1marinestorage.ca",
  address: {
    street: "639 Concession Road 16 East",
    city: "Tiny",
    region: "ON", // ISO-ish region code used in schema.org PostalAddress
    regionName: "Ontario",
    postalCode: "L9M 1R2",
    country: "CA",
  },
  // Business hours as shown on /facility. `note` is human copy; the day/opens/
  // closes feed schema.org openingHoursSpecification.
  hours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "09:00",
    closes: "18:00",
    note: "By appointment only",
  },
  priceRange: "$$",
  // geo intentionally omitted — see docs/seo-audit.md. Provide exact lat/lng to
  // enrich the LocalBusiness map pin; the PostalAddress is sufficient without it.
} as const;

// Georgian Bay service area — the towns we serve. Feeds `areaServed` structured
// data, the homepage service-area strip, and (Phase 2) the locality page set.
// The canonical per-town data (slug, distance, marinas, intro) lives in
// client/src/content/localities.ts; this is just the plain name list.
export const SERVICE_AREA = [
  "Tiny",
  "Midland",
  "Penetanguishene",
  "Wasaga Beach",
  "Victoria Harbour",
  "Port McNicoll",
  "Honey Harbour",
  "Lafontaine",
  "Balm Beach",
  "Waubaushene",
  "Coldwater",
  "Orillia",
  "Barrie",
] as const;
