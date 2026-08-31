import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import os from "node:os";

process.env.STORAGE_WEBHOOK_DISABLED = "1";
process.env.QUOTE_LOG_DIR = path.join(os.tmpdir(), "a1-quote-handoff-test");

/**
 * The seam between the calculator's Step 2 and EmpireVu.
 *
 * The payloads below are the REAL ones the browser sends — captured from the
 * running calculator, not hand-written — because the failure this guards against
 * is a field the UI renames on its way out. The client says `townSlug`; the
 * envelope says `town`. Nothing errors when that mapping breaks: the lead just
 * arrives with no pickup location, and EmpireVu quietly declines to auto-quote
 * it for the wrong reason.
 */
const buildStorageQuoteEnvelope = vi.fn(() => ({ meta: {} }));
vi.mock("./empirevu", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./empirevu")>();
  return { ...actual, buildStorageQuoteEnvelope, forwardToEmpireVu: vi.fn(async () => {}) };
});

const { handleQuoteSubmission } = await import("./quote-handler");

const contact = { name: "Pat Quinn", email: "pat@example.com", phone: "705-555-0100" };

/** Exactly what the calculator posted for a 24 ft cruiser out of Honey Harbour. */
const captured = {
  quoteInput: {
    serviceLine: "storage" as const,
    hullType: "cruiser",
    bundleId: "winter_ready_plus",
    items: [
      { serviceId: "outdoor_storage", lengthFt: 24 },
      { serviceId: "shrink_wrap", lengthFt: 24 },
      { serviceId: "winterization_outboard", engineType: "outboard" as const, engineCount: 1 },
      { serviceId: "transport_regional", quantity: 1 },
      { serviceId: "transport_regional", quantity: 1 },
      { serviceId: "trailer_storage" },
      { serviceId: "battery_storage", quantity: 1 },
    ],
  },
  contact,
  meta: {
    mode: "bundle",
    bundleId: "winter_ready_plus",
    ceramicUpgrade: false,
    lengthFt: 24,
    logistics: {
      boatLocation: "home_trailer",
      townSlug: "honey-harbour",
      postalCode: null,
      transportBand: "regional",
      distanceKm: 35,
      bandResolution: "locality",
      pickup: true,
      delivery: true,
      trailerProvided: true,
    },
    addOns: { batteryCount: 1, extendedMonths: 0, oilChangeOutboard: false, springWrapRemoval: false },
  },
};

const lastCall = () => buildStorageQuoteEnvelope.mock.calls.at(-1)![0] as {
  logistics?: Record<string, unknown>;
  selection?: { bundleKey?: string; variant?: string; services?: Array<Record<string, unknown>> };
};

beforeEach(() => buildStorageQuoteEnvelope.mockClear());

describe("logistics reaches the envelope", () => {
  it("renames townSlug to town", async () => {
    await handleQuoteSubmission(captured);
    expect(lastCall().logistics).toMatchObject({ town: "honey-harbour", transportBand: "regional", distanceKm: 35 });
  });

  it("keeps both trips and the trailer", async () => {
    await handleQuoteSubmission(captured);
    expect(lastCall().logistics).toMatchObject({ pickup: true, delivery: true, trailerProvided: true });
  });

  it("drops a null postal code rather than sending null", async () => {
    await handleQuoteSubmission(captured);
    expect(lastCall().logistics).not.toHaveProperty("postalCode");
  });

  it("keeps a zeroed add-on out of the envelope", async () => {
    await handleQuoteSubmission(captured);
    // extendedMonths: 0 and oilChangeOutboard: false are "not chosen", not data.
    expect(lastCall().logistics).not.toHaveProperty("extendedMonths");
    expect(lastCall().logistics).toMatchObject({ batteryCount: 1 });
  });

  it("derives inWaterNotice from the location, since the client never sends it", async () => {
    await handleQuoteSubmission({
      ...captured,
      meta: { ...captured.meta, logistics: { ...captured.meta.logistics, boatLocation: "lift_or_water" } },
    });
    // This is what stops EmpireVu auto-quoting a boat that needs hauling out
    // first — a job with no priced line and no way to do it at the quoted price.
    expect(lastCall().logistics).toMatchObject({ inWaterNotice: true });
  });

  it("does not invent an in-water notice for a trailered boat", async () => {
    await handleQuoteSubmission(captured);
    expect(lastCall().logistics).not.toHaveProperty("inWaterNotice");
  });
});

describe("selection is derived from the priced input", () => {
  it("carries every service key, with measures and quantities", async () => {
    await handleQuoteSubmission(captured);
    const sel = lastCall().selection!;
    expect(sel.bundleKey).toBe("winter_ready_plus");
    expect(sel.variant).toBe("cruiser");
    expect(sel.services).toEqual([
      { serviceKey: "outdoor_storage", measure: 24, quantity: undefined },
      { serviceKey: "shrink_wrap", measure: 24, quantity: undefined },
      // engineCount becomes quantity: EmpireVu's catalog has one count field.
      { serviceKey: "winterization_outboard", measure: undefined, quantity: 1 },
      { serviceKey: "transport_regional", measure: undefined, quantity: 1 },
      { serviceKey: "transport_regional", measure: undefined, quantity: 1 },
      { serviceKey: "trailer_storage", measure: undefined, quantity: undefined },
      { serviceKey: "battery_storage", measure: undefined, quantity: 1 },
    ]);
  });

  it("keeps BOTH transport trips, which a de-duplicating map would lose", async () => {
    await handleQuoteSubmission(captured);
    const trips = lastCall().selection!.services!.filter((s) => s.serviceKey === "transport_regional");
    expect(trips).toHaveLength(2);
  });
});

describe("a submission without Step 2 data is unchanged", () => {
  it("passes no logistics at all", async () => {
    await handleQuoteSubmission({ ...captured, meta: { mode: "bundle", lengthFt: 24 } });
    expect(lastCall().logistics).toBeUndefined();
  });
});
