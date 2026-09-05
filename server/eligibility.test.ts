import { describe, expect, it } from "vitest";

import { evaluateEligibility } from "./eligibility";

const clean = {
  hullType: "bowrider",
  lengthFt: 24,
  boatLocation: "home_trailer",
  transportBand: "local",
  extendedMonths: 0,
};

describe("auto-quote eligibility", () => {
  it("passes an ordinary quote", () => {
    expect(evaluateEligibility(clean)).toEqual({
      autoQuoteEligible: true,
      reasons: [],
    });
  });

  it("flags a hull we cannot price sight-unseen", () => {
    const r = evaluateEligibility({ ...clean, hullType: "other" });
    expect(r.autoQuoteEligible).toBe(false);
    expect(r.reasons).toEqual(["hull_other"]);
  });

  it("flags an in-water boat — there is no priced line for a haul-out", () => {
    expect(
      evaluateEligibility({ ...clean, boatLocation: "lift_or_water" }).reasons
    ).toEqual(["in_water"]);
  });

  it("flags a boat beyond the furthest transport band", () => {
    expect(
      evaluateEligibility({ ...clean, transportBand: "beyond" }).reasons
    ).toEqual(["transport_beyond"]);
  });

  it("treats NO transport as fine — that is not the same as transport we cannot price", () => {
    expect(
      evaluateEligibility({ ...clean, transportBand: null }).autoQuoteEligible
    ).toBe(true);
  });

  it("flags over 40 ft, and allows exactly 40", () => {
    expect(evaluateEligibility({ ...clean, lengthFt: 41 }).reasons).toEqual([
      "over_40ft",
    ]);
    expect(
      evaluateEligibility({ ...clean, lengthFt: 40 }).autoQuoteEligible
    ).toBe(true);
  });

  it("flags extended storage months", () => {
    expect(
      evaluateEligibility({ ...clean, extendedMonths: 2 }).reasons
    ).toEqual(["extended_storage"]);
  });

  it("reports every reason, not just the first — the yard needs the whole picture", () => {
    const r = evaluateEligibility({
      hullType: "other",
      lengthFt: 48,
      boatLocation: "lift_or_water",
      transportBand: "beyond",
      extendedMonths: 3,
    });
    expect(r.autoQuoteEligible).toBe(false);
    expect(r.reasons.sort()).toEqual(
      [
        "extended_storage",
        "hull_other",
        "in_water",
        "over_40ft",
        "transport_beyond",
      ].sort()
    );
  });

  it("is total — an empty input is eligible rather than throwing", () => {
    expect(evaluateEligibility({}).autoQuoteEligible).toBe(true);
  });
});
