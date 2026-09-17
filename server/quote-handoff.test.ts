import { describe, expect, it } from "vitest";

import { buildStorageQuoteEnvelope } from "./empirevu";

/**
 * The calculator's Step 2 collects transport and add-ons; EmpireVu turns a lead
 * into a payable quote from what arrives here. These pin the two seams where
 * that goes wrong without anyone noticing: a renamed field silently dropping, and
 * a quote WITHOUT logistics changing shape (which would break every golden
 * fixture and, worse, every existing integration).
 */

const base = {
  id: "1f0c2f5a-0000-4000-8000-000000000000",
  receivedAt: "2026-09-02T14:00:00.000Z",
  contact: { name: "Pat Quinn", email: "pat@example.com", phone: "705-555-0100" },
  quote: {
    hullType: "pontoon",
    subtotalCents: 250000,
    bundle: { label: "Winter Ready Plus" },
    lineItems: [{ detail: { lengthFt: 24 } }],
  },
  jobberLineItems: [{ description: "Winter storage, shrink wrap & spring removal", quantity: 1, unitPriceCents: 144000 }],
};

const metaOf = (env: ReturnType<typeof buildStorageQuoteEnvelope>) =>
  env.meta as Record<string, Record<string, unknown> | undefined>;

describe("selection travels by service KEY", () => {
  it("carries keys, measures and quantities", () => {
    const env = buildStorageQuoteEnvelope({
      ...base,
      selection: {
        bundleKey: "winter_ready_plus",
        variant: "pontoon",
        services: [
          { serviceKey: "winter_storage", measure: 24 },
          { serviceKey: "battery_storage", quantity: 2 },
        ],
      },
    });

    const sel = metaOf(env).selection!;
    expect(sel.bundleKey).toBe("winter_ready_plus");
    expect(sel.variant).toBe("pontoon");
    // Keys, not the priced labels in lineItems: EmpireVu re-prices these against
    // its own catalog, and it cannot do that by string-matching descriptions.
    expect(sel.services).toEqual([
      { serviceKey: "winter_storage", measure: 24 },
      { serviceKey: "battery_storage", quantity: 2 },
    ]);
  });

  it("is absent entirely when not supplied", () => {
    expect(metaOf(buildStorageQuoteEnvelope(base)).selection).toBeUndefined();
  });
});

describe("logistics survives the trip", () => {
  it("keeps a delivery-only choice distinguishable from no transport at all", () => {
    const env = buildStorageQuoteEnvelope({
      ...base,
      logistics: { boatLocation: "home_trailer", transportBand: "local", pickup: false, delivery: true },
    });
    const log = metaOf(env).logistics!;
    // false must NOT be compacted away: "I'll tow it in, you deliver it back" is
    // a real and differently-priced choice from "no transport".
    expect(log.pickup).toBe(false);
    expect(log.delivery).toBe(true);
  });

  it("carries the in-water flag that blocks an auto-quote", () => {
    const env = buildStorageQuoteEnvelope({
      ...base,
      logistics: { boatLocation: "lift_or_water", inWaterNotice: true },
    });
    // A boat in the water needs a haul-out, which has no priced line. Without
    // this flag EmpireVu would auto-quote a job it cannot actually do at the
    // price quoted.
    expect(metaOf(env).logistics!.inWaterNotice).toBe(true);
  });
});

/**
 * The guarantee that keeps this change safe to ship mid-season: a quote with
 * neither block must serialise exactly as it did before Step 2 existed.
 */
describe("a quote without Step 2 data is unchanged", () => {
  it("has neither key, and meta is otherwise identical", () => {
    const env = buildStorageQuoteEnvelope(base);
    expect(env.meta).toEqual({ site: "a1marinestorage.ca", page: "/calculator" });
  });

  it("drops an empty selection rather than emitting an empty object", () => {
    const env = buildStorageQuoteEnvelope({ ...base, selection: {} });
    expect(metaOf(env).selection).toBeUndefined();
  });
});
