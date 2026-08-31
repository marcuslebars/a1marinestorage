import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildStorageQuoteEnvelope, compactLogistics } from "./empirevu";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "__fixtures__", "lead-envelopes", name), "utf8"));

const CONTACT = {
  name: "Pat Quinn",
  email: "pat@example.com",
  phone: "705-555-0142",
  boatMakeModelYear: "2018 Sea Ray 240",
  marina: "Queen's Cove",
};

/**
 * Logistics rides in `meta`, not at the envelope's top level: LEAD_SCHEMA.md
 * fixes schemaVersion 1's top-level keys and says to version rather than mutate.
 * These fixtures are generated from the builder (scripts/gen-logistics-fixtures.mjs)
 * so they cannot encode a shape the builder doesn't produce.
 */
describe("logistics envelopes match their fixtures (drift guard)", () => {
  it("local band, pickup + delivery", () => {
    const env = buildStorageQuoteEnvelope({
      id: "q-local",
      receivedAt: "2026-09-02T14:00:00.000Z",
      contact: CONTACT,
      quote: {
        hullType: null,
        subtotalCents: 237500,
        bundle: { label: "Winter Ready Plus" },
        lineItems: [{ detail: { lengthFt: 24 } }, { detail: {} }],
      },
      jobberLineItems: [
        { description: "Outdoor winter storage — 24ft", quantity: 1, unitPriceCents: 120000 },
        { description: "Transport — local (fall pickup)", quantity: 1, unitPriceCents: 15000 },
        { description: "Transport — local (spring delivery)", quantity: 1, unitPriceCents: 15000 },
      ],
      logistics: {
        boatLocation: "home_trailer",
        town: "midland",
        transportBand: "local",
        distanceKm: 18,
        bandResolution: "locality",
        pickup: true,
        delivery: true,
      },
    });
    expect(env).toEqual(fixture("storage-quote-transport-local.json"));
  });

  it("extended band, delivery only", () => {
    const env = buildStorageQuoteEnvelope({
      id: "q-extended",
      receivedAt: "2026-09-02T14:05:00.000Z",
      contact: CONTACT,
      quote: { hullType: null, subtotalCents: 157500, bundle: null, lineItems: [{ detail: { lengthFt: 22 } }] },
      jobberLineItems: [
        { description: "Outdoor winter storage — 22ft", quantity: 1, unitPriceCents: 110000 },
        { description: "Transport — extended (spring delivery)", quantity: 1, unitPriceCents: 37500 },
      ],
      logistics: {
        boatLocation: "marina_ramp",
        town: "Gravenhurst",
        transportBand: "extended",
        distanceKm: 95,
        bandResolution: "place_estimate",
        pickup: false,
        delivery: true,
      },
    });
    expect(env).toEqual(fixture("storage-quote-transport-extended-delivery-only.json"));
  });

  it("trailer provided with no transport at all", () => {
    const env = buildStorageQuoteEnvelope({
      id: "q-trailer",
      receivedAt: "2026-09-02T14:10:00.000Z",
      contact: CONTACT,
      quote: { hullType: null, subtotalCents: 140000, bundle: null, lineItems: [{ detail: { lengthFt: 24 } }] },
      jobberLineItems: [
        { description: "Outdoor winter storage — 24ft", quantity: 1, unitPriceCents: 120000 },
        { description: "Trailer storage (season)", quantity: 1, unitPriceCents: 20000 },
      ],
      logistics: { boatLocation: "self_transport", trailerProvided: true, batteryCount: 2 },
    });
    expect(env).toEqual(fixture("storage-quote-trailer-no-transport.json"));
  });

  it("beyond band carries no transport line item", () => {
    const env = buildStorageQuoteEnvelope({
      id: "q-beyond",
      receivedAt: "2026-09-02T14:15:00.000Z",
      contact: CONTACT,
      quote: { hullType: null, subtotalCents: 120000, bundle: null, lineItems: [{ detail: { lengthFt: 24 } }] },
      jobberLineItems: [
        { description: "Outdoor winter storage — 24ft", quantity: 1, unitPriceCents: 120000 },
      ],
      logistics: {
        boatLocation: "lift_or_water",
        town: "Kingston",
        transportBand: "beyond",
        distanceKm: 310,
        bandResolution: "place_estimate",
        pickup: true,
        delivery: true,
        inWaterNotice: true,
      },
    });
    expect(env).toEqual(fixture("storage-quote-transport-beyond.json"));

    // The band rides along so the follow-up knows to price it by hand, but no
    // transport line is billed — quoting one would invent a rate.
    expect(env.lineItems?.some((l) => /transport/i.test(l.description))).toBe(false);
    expect((env.meta as Record<string, never>).logistics).toMatchObject({ transportBand: "beyond" });
  });
});

/**
 * The golden-fixture guarantee: a quote with no logistics must serialise exactly
 * as it did before any of this existed.
 */
describe("absent logistics changes nothing", () => {
  const baseInput = {
    id: "q1",
    receivedAt: "2026-07-10T15:20:00.000Z",
    contact: {
      name: "Marcus Reed",
      email: "marcus@example.com",
      phone: "705-555-0199",
      boatMakeModelYear: "2019 Sylvan Mirage",
      marina: "Bayfield",
    },
    quote: {
      hullType: "pontoon",
      subtotalCents: 141312,
      bundle: { label: "Winter Ready" },
      lineItems: [{ detail: { lengthFt: 24 } }, { detail: {} }, { detail: {} }],
    },
    jobberLineItems: [
      { description: "Shrink Wrap (24ft)", quantity: 1, unitPriceCents: 41400 },
      { description: "Pontoon hull surcharge", quantity: 1, unitPriceCents: 5000 },
      { description: "Winterization — I/O", quantity: 1, unitPriceCents: 27500 },
    ],
    utm: { utm_source: "google", utm_campaign: "fall-storage" },
  };

  it("omitting logistics is byte-identical to the pre-existing golden fixture", () => {
    const env = buildStorageQuoteEnvelope(baseInput);
    expect(env).toEqual(fixture("storage-quote.json"));
    expect(JSON.stringify(env)).toBe(JSON.stringify(fixture("storage-quote.json")));
  });

  it("passing an empty logistics object also drops the key entirely", () => {
    const env = buildStorageQuoteEnvelope({ ...baseInput, logistics: {} });
    expect((env.meta as Record<string, unknown>).logistics).toBeUndefined();
    expect(JSON.stringify(env)).toBe(JSON.stringify(fixture("storage-quote.json")));
  });
});

describe("compactLogistics", () => {
  it("drops undefined but KEEPS false", () => {
    // pickup:false is a real choice — the customer tows it in, we deliver in
    // spring. Dropping it would read as "no transport".
    expect(compactLogistics({ pickup: false, delivery: true, town: undefined })).toEqual({
      pickup: false,
      delivery: true,
    });
  });

  it("drops empty strings, which is how an untouched text field arrives", () => {
    expect(compactLogistics({ town: "", transportBand: "local" })).toEqual({
      transportBand: "local",
    });
  });

  it("returns undefined for nothing at all, so meta stays clean", () => {
    expect(compactLogistics(undefined)).toBeUndefined();
    expect(compactLogistics({})).toBeUndefined();
    expect(compactLogistics({ town: undefined })).toBeUndefined();
  });

  it("keeps a zero count rather than mistaking it for unset", () => {
    // 0 batteries is not the same as "didn't answer", and compact() keeps 0.
    expect(compactLogistics({ batteryCount: 0 })).toEqual({ batteryCount: 0 });
  });
});
