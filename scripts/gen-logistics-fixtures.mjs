/**
 * Generate the logistics lead-envelope fixtures from the real builder.
 *
 * Written from buildStorageQuoteEnvelope rather than by hand so a fixture can
 * never encode a shape the builder does not actually produce. Re-run after
 * changing the envelope; the drift-guard test then compares builder output to
 * these files.
 *
 * Usage: node scripts/gen-logistics-fixtures.mjs
 */
import { writeFileSync } from "node:fs";

import { buildStorageQuoteEnvelope } from "../server/empirevu.ts";

const CONTACT = {
  name: "Pat Quinn",
  email: "pat@example.com",
  phone: "705-555-0142",
  boatMakeModelYear: "2018 Sea Ray 240",
  marina: "Queen's Cove",
};

const CASES = [
  {
    file: "storage-quote-transport-local.json",
    // Local band, both trips: the ordinary case.
    input: {
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
    },
  },
  {
    file: "storage-quote-transport-extended-delivery-only.json",
    // Delivery only: pickup FALSE must survive compaction, or this reads as
    // "no transport at all" on the intake side.
    input: {
      id: "q-extended",
      receivedAt: "2026-09-02T14:05:00.000Z",
      contact: CONTACT,
      quote: {
        hullType: null,
        subtotalCents: 157500,
        bundle: null,
        lineItems: [{ detail: { lengthFt: 22 } }],
      },
      jobberLineItems: [
        { description: "Outdoor winter storage — 22ft", quantity: 1, unitPriceCents: 110000 },
        { description: "Transport — extended (spring delivery)", quantity: 1, unitPriceCents: 37500 },
      ],
      logistics: {
        boatLocation: "marina_ramp",
        postalCode: "L4M 1A1",
        transportBand: "extended",
        distanceKm: 95,
        bandResolution: "postal_estimate",
        pickup: false,
        delivery: true,
      },
    },
  },
  {
    file: "storage-quote-trailer-no-transport.json",
    // Tows it in themselves but has no trailer to leave it on.
    input: {
      id: "q-trailer",
      receivedAt: "2026-09-02T14:10:00.000Z",
      contact: CONTACT,
      quote: {
        hullType: null,
        subtotalCents: 140000,
        bundle: null,
        lineItems: [{ detail: { lengthFt: 24 } }],
      },
      jobberLineItems: [
        { description: "Outdoor winter storage — 24ft", quantity: 1, unitPriceCents: 120000 },
        { description: "Trailer storage (season)", quantity: 1, unitPriceCents: 20000 },
      ],
      logistics: {
        boatLocation: "self_transport",
        trailerProvided: true,
        batteryCount: 2,
      },
    },
  },
  {
    file: "storage-quote-transport-beyond.json",
    // Beyond the furthest band: NO transport line and no total. Quoted by hand.
    // The band still rides in the envelope so the follow-up knows to price it.
    input: {
      id: "q-beyond",
      receivedAt: "2026-09-02T14:15:00.000Z",
      contact: CONTACT,
      quote: {
        hullType: null,
        subtotalCents: 120000,
        bundle: null,
        lineItems: [{ detail: { lengthFt: 24 } }],
      },
      jobberLineItems: [
        { description: "Outdoor winter storage — 24ft", quantity: 1, unitPriceCents: 120000 },
      ],
      logistics: {
        boatLocation: "lift_or_water",
        postalCode: "K7L 3N6",
        transportBand: "beyond",
        distanceKm: 310,
        bandResolution: "postal_estimate",
        pickup: true,
        delivery: true,
        inWaterNotice: true,
      },
    },
  },
];

for (const c of CASES) {
  const env = buildStorageQuoteEnvelope(c.input);
  writeFileSync(
    `server/__fixtures__/lead-envelopes/${c.file}`,
    JSON.stringify(env, null, 2) + "\n",
  );
  console.log(`wrote ${c.file}`);
}
