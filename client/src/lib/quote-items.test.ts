import { describe, it, expect } from "vitest";
import { calculateQuote } from "@a1/pricing-engine";
import { buildStorageQuoteInput, type BoatState, type Selection } from "./quote-items";

const boat = (over: Partial<BoatState>): BoatState => ({
  lengthFt: 24,
  hullType: "bowrider",
  engineType: "outboard",
  engineCount: 1,
  ...over,
});

function priceFor(sel: Selection, b: BoatState) {
  const input = buildStorageQuoteInput(sel, b);
  if (!input) throw new Error("expected a quote input");
  return calculateQuote(input);
}

// The page maps selections → engine input; these prove that mapping produces the
// authoritative contract prices, end to end.
describe("storage quote page mapping → engine (contract check cases)", () => {
  it("24ft bowrider, Winter Ready → $1,656.00", () => {
    const q = priceFor({ mode: "bundle", bundleId: "winter_ready" }, boat({ lengthFt: 24, hullType: "bowrider" }));
    expect(q.subtotalCents).toBe(165600);
  });

  it("22ft pontoon, outboard, Winter Ready Plus → $2,049.30", () => {
    const q = priceFor(
      { mode: "bundle", bundleId: "winter_ready_plus" },
      boat({ lengthFt: 22, hullType: "pontoon", engineType: "outboard", engineCount: 1 }),
    );
    expect(q.subtotalCents).toBe(204930);
  });

  it("14ft, storage only (à la carte) → $750.00", () => {
    const q = priceFor({ mode: "alacarte", alacarteIds: ["outdoor_storage"] }, boat({ lengthFt: 14, hullType: "other" }));
    expect(q.subtotalCents).toBe(75000);
  });

  it("28ft cruiser, twin inboards, Full Care → $3,358.08", () => {
    const q = priceFor(
      { mode: "bundle", bundleId: "full_care" },
      boat({ lengthFt: 28, hullType: "cruiser", engineType: "inboard", engineCount: 2 }),
    );
    expect(q.subtotalCents).toBe(335808);
  });

  it("ceramic upsell adds full price and is never bundle-discounted", () => {
    const q = priceFor(
      { mode: "bundle", bundleId: "winter_ready", ceramicUpgrade: true },
      boat({ lengthFt: 24, hullType: "bowrider" }),
    );
    const ceramic = q.lineItems.find((l) => l.serviceId === "ceramic_upgrade");
    expect(ceramic?.bundleEligible).toBe(false);
    expect(q.subtotalCents).toBe(165600 + 204000);
  });

  it("à la carte winterization resolves to the selected engine type", () => {
    const q = priceFor(
      { mode: "alacarte", alacarteIds: ["winterization"] },
      boat({ lengthFt: 26, engineType: "sterndrive", engineCount: 1 }),
    );
    expect(q.lineItems[0].serviceId).toBe("winterization_sterndrive");
    expect(q.lineItems[0].amountCents).toBe(40000);
  });
});
