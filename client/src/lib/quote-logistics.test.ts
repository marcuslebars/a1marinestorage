import { calculateQuote } from "@a1/pricing-engine";
import { describe, expect, it } from "vitest";

import {
  buildStorageQuoteInput,
  describeExtras,
  needsHaulOutNotice,
  supportsTransport,
  transportServiceId,
  type BoatState,
  type Selection,
} from "./quote-items";

const BOAT: BoatState = { lengthFt: 24, hullType: "", engineType: "outboard", engineCount: 1 };

/** Every expected number here comes from the engine, never from this file. */
const price = (sel: Selection, boat: BoatState = BOAT) => {
  const input = buildStorageQuoteInput(sel, boat);
  return input ? calculateQuote(input) : null;
};

const BASE: Selection = { mode: "alacarte", alacarteIds: ["outdoor_storage"] };

describe("boat location gates transport", () => {
  it("self-transport offers no transport lines", () => {
    expect(supportsTransport("self_transport")).toBe(false);
    for (const l of ["home_trailer", "marina_ramp", "lift_or_water"] as const) {
      expect(supportsTransport(l)).toBe(true);
    }
  });

  it("only in-water needs the haul-out notice", () => {
    expect(needsHaulOutNotice("lift_or_water")).toBe(true);
    for (const l of ["self_transport", "home_trailer", "marina_ramp"] as const) {
      expect(needsHaulOutNotice(l)).toBe(false);
    }
  });

  it("adds no transport line when the customer brings the boat themselves", () => {
    const r = price({
      ...BASE,
      logistics: { boatLocation: "self_transport", transportBand: "local", pickup: true, delivery: true },
    })!;
    expect(r.lineItems.filter((l) => l.serviceId.startsWith("transport_"))).toHaveLength(0);
  });
});

describe("transport bands map to engine services", () => {
  it("names the engine's service keys", () => {
    expect(transportServiceId("local")).toBe("transport_local");
    expect(transportServiceId("regional")).toBe("transport_regional");
    expect(transportServiceId("extended")).toBe("transport_extended");
  });

  it("BEYOND has no flat service — it must never produce a line total", () => {
    // Quoted by hand. A line here would invent a price the business has not set.
    expect(transportServiceId("beyond")).toBeNull();
    const r = price({
      ...BASE,
      logistics: { boatLocation: "home_trailer", transportBand: "beyond", pickup: true, delivery: true },
    })!;
    expect(r.lineItems.filter((l) => l.serviceId.startsWith("transport_"))).toHaveLength(0);
  });

  it("pickup and delivery are two separate lines, each one trip", () => {
    const r = price({
      ...BASE,
      logistics: { boatLocation: "home_trailer", transportBand: "local", pickup: true, delivery: true },
    })!;
    const t = r.lineItems.filter((l) => l.serviceId === "transport_local");
    expect(t).toHaveLength(2);
    expect(t[0].amountCents).toBe(t[1].amountCents);
  });

  it("either direction can be dropped", () => {
    const deliveryOnly = price({
      ...BASE,
      logistics: { boatLocation: "marina_ramp", transportBand: "extended", pickup: false, delivery: true },
    })!;
    expect(deliveryOnly.lineItems.filter((l) => l.serviceId === "transport_extended")).toHaveLength(1);
  });

  it("a further band costs more than a nearer one — from the engine's rates", () => {
    const at = (band: "local" | "regional" | "extended") =>
      price({
        ...BASE,
        logistics: { boatLocation: "home_trailer", transportBand: band, pickup: true, delivery: false },
      })!.subtotalCents;
    expect(at("local")).toBeLessThan(at("regional"));
    expect(at("regional")).toBeLessThan(at("extended"));
  });
});

/**
 * The whole point of appending these AFTER the bundle services: a bundle
 * discounts only the services named in its own list, so nothing here is
 * discounted — and that is the engine's rule, not a flag in this repo.
 */
describe("logistics and add-ons sit outside the bundle discount", () => {
  const bundled: Selection = { mode: "bundle", bundleId: "winter_ready_plus" };

  it("adding transport does not change the bundle savings", () => {
    const without = price(bundled)!;
    const withTransport = price({
      ...bundled,
      logistics: { boatLocation: "home_trailer", transportBand: "local", pickup: true, delivery: true },
    })!;
    expect(withTransport.bundleSavingsCents).toBe(without.bundleSavingsCents);
  });

  it("transport lines are not bundle-eligible", () => {
    const r = price({
      ...bundled,
      logistics: { boatLocation: "home_trailer", transportBand: "local", pickup: true, delivery: true, trailerProvided: true },
    })!;
    for (const line of r.lineItems) {
      if (line.serviceId.startsWith("transport_") || line.serviceId === "trailer_storage") {
        expect(line.bundleEligible, line.serviceId).toBe(false);
      }
    }
  });

  it("add-ons do not change the bundle savings either", () => {
    const without = price(bundled)!;
    const withAddOns = price({
      ...bundled,
      addOns: { batteryCount: 2, extendedMonths: 3, oilChangeOutboard: true, springWrapRemoval: true },
    })!;
    expect(withAddOns.bundleSavingsCents).toBe(without.bundleSavingsCents);
    expect(withAddOns.subtotalCents).toBeGreaterThan(without.subtotalCents);
  });
});

describe("trailer provided", () => {
  it("is selectable without any transport at all", () => {
    // A customer can tow the boat in but have no trailer to leave it on.
    const r = price({
      ...BASE,
      logistics: { boatLocation: "self_transport", trailerProvided: true },
    })!;
    expect(r.lineItems.some((l) => l.serviceId === "trailer_storage")).toBe(true);
    expect(r.lineItems.filter((l) => l.serviceId.startsWith("transport_"))).toHaveLength(0);
  });
});

describe("add-ons", () => {
  it("battery and extended storage scale by quantity, per the engine", () => {
    const one = price({ ...BASE, addOns: { batteryCount: 1 } })!.subtotalCents;
    const three = price({ ...BASE, addOns: { batteryCount: 3 } })!.subtotalCents;
    const base = price(BASE)!.subtotalCents;
    expect(three - base).toBe((one - base) * 3);
  });

  it("oil change is offered only for outboards — the engine has no other service", () => {
    const outboard = price({ ...BASE, addOns: { oilChangeOutboard: true } })!;
    expect(outboard.lineItems.some((l) => l.serviceId === "oil_change_outboard")).toBe(true);

    const sterndrive = price({ ...BASE, addOns: { oilChangeOutboard: true } }, { ...BOAT, engineType: "sterndrive" })!;
    expect(sterndrive.lineItems.some((l) => l.serviceId === "oil_change_outboard")).toBe(false);
  });

  it("oil change covers every engine on the boat", () => {
    const twin = price({ ...BASE, addOns: { oilChangeOutboard: true } }, { ...BOAT, engineCount: 2 })!;
    const line = twin.lineItems.find((l) => l.serviceId === "oil_change_outboard")!;
    expect(line.detail.unitCount).toBe(2);
  });

  it("zero quantities add nothing", () => {
    const base = price(BASE)!;
    const zeroed = price({ ...BASE, addOns: { batteryCount: 0, extendedMonths: 0 } })!;
    expect(zeroed.subtotalCents).toBe(base.subtotalCents);
    expect(zeroed.lineItems).toHaveLength(base.lineItems.length);
  });
});

/**
 * Two transport trips share a service key, so the engine's output alone cannot
 * say which row is pickup and which is delivery. describeExtras is what lets the
 * UI and the PDF label them — if it drifts from appendExtras, a customer sees a
 * price against the wrong label.
 */
describe("describeExtras indexes the appended lines", () => {
  it("points at the right engine lines, in order", () => {
    const sel: Selection = {
      ...BASE,
      ceramicUpgrade: true,
      logistics: { boatLocation: "home_trailer", transportBand: "regional", pickup: true, delivery: true, trailerProvided: true },
      addOns: { batteryCount: 2, springWrapRemoval: true },
    };
    const r = price(sel)!;
    const refs = describeExtras(sel, BOAT);

    expect(refs.map((x) => x.purpose)).toEqual([
      "ceramic",
      "pickup",
      "delivery",
      "trailer",
      "battery",
      "wrap_removal",
    ]);

    for (const ref of refs) {
      expect(r.lineItems[ref.index], `index ${ref.index} (${ref.purpose})`).toBeTruthy();
      expect(r.lineItems[ref.index].serviceId).toBe(ref.serviceId);
    }
  });

  it("stays aligned when nothing extra is selected", () => {
    expect(describeExtras(BASE, BOAT)).toEqual([]);
  });

  it("covers every appended line — no unlabelled extras", () => {
    const sel: Selection = {
      mode: "bundle",
      bundleId: "full_care",
      logistics: { boatLocation: "marina_ramp", transportBand: "local", pickup: true, delivery: true, trailerProvided: true },
      addOns: { batteryCount: 1, extendedMonths: 2, oilChangeOutboard: true, springWrapRemoval: true },
    };
    const r = price(sel)!;
    const refs = describeExtras(sel, BOAT);
    const baseCount = r.lineItems.length - refs.length;

    // Every line beyond the bundle's own services must be described.
    expect(refs.map((x) => x.index)).toEqual(
      Array.from({ length: refs.length }, (_, k) => baseCount + k),
    );
  });
});
