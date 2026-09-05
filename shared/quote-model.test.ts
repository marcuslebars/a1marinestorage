import { calculateQuote } from "@a1/pricing-engine";
import { describe, expect, it } from "vitest";

import {
  buildQuoteModel,
  DEPOSIT_RATE_BPS,
  engineLabel,
  generateQuoteReference,
  HST_RATE_BPS,
  money,
  roundHalfUpDiv,
  totalsFromSubtotal,
} from "./quote-model";
import {
  buildStorageQuoteInput,
  describeExtras,
  type BoatState,
  type Selection,
} from "../client/src/lib/quote-items";

const BOAT: BoatState = {
  lengthFt: 24,
  hullType: "",
  engineType: "outboard",
  engineCount: 1,
};

const modelFor = (sel: Selection, boat: BoatState = BOAT) => {
  const input = buildStorageQuoteInput(sel, boat)!;
  return buildQuoteModel({
    reference: "A1MS-Q-TEST01",
    issuedAt: "2026-09-02T12:00:00.000Z",
    quote: calculateQuote(input),
    extras: describeExtras(sel, boat),
    boat: {
      lengthFt: boat.lengthFt,
      engineType: boat.engineType,
      engineCount: boat.engineCount,
    },
  });
};

describe("totals", () => {
  it("adds HST and takes the deposit off the TAX-INCLUSIVE total", () => {
    // The deposit is a share of what the customer actually pays, which is why
    // it is computed here rather than by the engine (whose result stops pre-tax).
    const t = totalsFromSubtotal(207_500);
    expect(t.taxCents).toBe(26_975);
    expect(t.totalCents).toBe(234_475);
    expect(t.depositCents).toBe(58_619);
  });

  it("uses HST 13% and a 25% deposit by default", () => {
    expect(HST_RATE_BPS).toBe(1300);
    expect(DEPOSIT_RATE_BPS).toBe(2500);
  });

  it("never lets the deposit exceed the total", () => {
    const t = totalsFromSubtotal(10_000, 1300, 20_000);
    expect(t.depositCents).toBe(t.totalCents);
  });

  it("rounds the half-cent boundary up, without float drift", () => {
    expect(roundHalfUpDiv(5, 10)).toBe(1);
    expect(roundHalfUpDiv(4, 10)).toBe(0);
    // 25% of $5,723.45 = $1,430.8625 -> $1,430.86
    expect(roundHalfUpDiv(572_345 * 2500, 10_000)).toBe(143_086);
  });

  it("handles a zero subtotal without producing NaN", () => {
    const t = totalsFromSubtotal(0);
    expect(t).toMatchObject({ taxCents: 0, totalCents: 0, depositCents: 0 });
  });
});

describe("model marks what sits outside the bundle", () => {
  it("flags transport and add-ons — and nothing else", () => {
    const sel: Selection = {
      mode: "bundle",
      bundleId: "winter_ready_plus",
      logistics: {
        boatLocation: "home_trailer",
        transportBand: "local",
        pickup: true,
        delivery: true,
        trailerProvided: true,
      },
      addOns: { batteryCount: 2 },
    };
    const m = modelFor(sel);

    const outside = m.lines.filter(l => l.outsideBundle);
    const inside = m.lines.filter(l => !l.outsideBundle);

    // Two transport trips + batteries. The trailer is NOT here: a boat on its
    // owner's trailer is not a charged service, so it produces no line at all.
    expect(outside).toHaveLength(3);
    // The bundle's own three services.
    expect(inside).toHaveLength(3);
  });

  it("keeps the bundle savings attached to the bundled lines only", () => {
    const bundled = modelFor({ mode: "bundle", bundleId: "winter_ready_plus" });
    const withExtras = modelFor({
      mode: "bundle",
      bundleId: "winter_ready_plus",
      logistics: {
        boatLocation: "home_trailer",
        transportBand: "extended",
        pickup: true,
        delivery: true,
      },
    });
    expect(withExtras.bundleSavingsCents).toBe(bundled.bundleSavingsCents);
    expect(withExtras.subtotalCents).toBeGreaterThan(bundled.subtotalCents);
  });

  it("marks nothing as outside when only a bundle is chosen", () => {
    const m = modelFor({ mode: "bundle", bundleId: "winter_ready" });
    expect(m.lines.every(l => !l.outsideBundle)).toBe(true);
  });

  it("carries the package label for the header", () => {
    expect(
      modelFor({ mode: "bundle", bundleId: "full_care" }).packageLabel
    ).toBe("Full Care");
    expect(
      modelFor({ mode: "alacarte", alacarteIds: ["outdoor_storage"] })
        .packageLabel
    ).toBeNull();
  });
});

describe("quote reference", () => {
  it("is prefixed and six characters long", () => {
    const ref = generateQuoteReference(new Uint8Array([0, 1, 2, 3, 4, 5]));
    expect(ref).toMatch(/^A1MS-Q-[A-Z2-9]{6}$/);
  });

  it("omits characters that get misread when read aloud", () => {
    // No I, O, 0 or 1 — these are quoted over the phone.
    const refs = Array.from({ length: 40 }, (_, i) =>
      generateQuoteReference(
        new Uint8Array([i, i + 7, i + 13, i + 19, i + 23, i + 29])
      )
    );
    for (const r of refs) {
      expect(r.slice(7)).not.toMatch(/[IO01]/);
    }
  });

  it("is deterministic for given bytes, so it can be regenerated", () => {
    const bytes = new Uint8Array([9, 8, 7, 6, 5, 4]);
    expect(generateQuoteReference(bytes)).toBe(generateQuoteReference(bytes));
  });
});

describe("display helpers", () => {
  it("formats CAD with thousands separators", () => {
    expect(money(234_475)).toBe("$2,344.75");
    expect(money(0)).toBe("$0.00");
    expect(money(5)).toBe("$0.05");
  });

  it("names the engine, with a count only when there is more than one", () => {
    expect(engineLabel("outboard", 1)).toBe("Outboard");
    expect(engineLabel("outboard", 2)).toBe("Outboard × 2");
    expect(engineLabel("sterndrive", 1)).toBe("Sterndrive");
  });
});

/**
 * The guarantee the PDF depends on: a model built from the same selection is
 * identical whoever builds it. The panel and the server-rendered PDF both go
 * through here, so they cannot show different money.
 */
describe("model is a pure function of the selection", () => {
  it("two builds of the same selection agree on every number", () => {
    const sel: Selection = {
      mode: "bundle",
      bundleId: "full_care",
      ceramicUpgrade: true,
      logistics: {
        boatLocation: "marina_ramp",
        transportBand: "regional",
        pickup: true,
        delivery: false,
        trailerProvided: true,
      },
      addOns: { batteryCount: 3, extendedMonths: 2, oilChangeOutboard: true },
    };
    const a = modelFor(sel);
    const b = modelFor(sel);

    expect(a.subtotalCents).toBe(b.subtotalCents);
    expect(a.taxCents).toBe(b.taxCents);
    expect(a.totalCents).toBe(b.totalCents);
    expect(a.depositCents).toBe(b.depositCents);
    expect(a.lines.map(l => l.amountCents)).toEqual(
      b.lines.map(l => l.amountCents)
    );
  });

  it("the subtotal is the sum of the lines, less the bundle saving", () => {
    const sel: Selection = {
      mode: "bundle",
      bundleId: "winter_ready_plus",
      logistics: {
        boatLocation: "home_trailer",
        transportBand: "local",
        pickup: true,
        delivery: true,
      },
      addOns: { batteryCount: 1 },
    };
    const m = modelFor(sel);
    const lineSum = m.lines.reduce((s, l) => s + l.amountCents, 0);
    expect(m.subtotalCents).toBe(lineSum - m.bundleSavingsCents);
  });
});
