// 1.2 (client half) — the token's Selection is not the form's state.
//
// These two shapes disagree in three specific places, and each one is a way a
// resumed quote can quietly come back wrong: the town (slug vs typed name), the
// add-ons (Selection.addOns vs LogisticsValue), and alacarteIds (array vs Set).
import { describe, expect, it } from "vitest";

import { OTHER_TOWN } from "@/components/LogisticsSection";
import {
  hydrateFromResume,
  resumeBanner,
  resumeLandingStep,
  type ResumePayload,
} from "./quote-resume";

const BOAT = {
  lengthFt: 24,
  hullType: "bowrider",
  engineType: "outboard" as const,
  engineCount: 2,
};

const listedTown: ResumePayload = {
  ok: true,
  ref: "A1MS-Q-ABC123",
  boat: BOAT,
  selection: {
    mode: "alacarte",
    bundleId: null,
    alacarteIds: ["shrink_wrap", "outdoor_storage"],
    ceramicUpgrade: true,
    logistics: {
      boatLocation: "home_trailer",
      townSlug: "midland",
      transportBand: "local",
      distanceKm: 12,
      bandResolution: "locality",
      pickup: true,
      delivery: false,
      trailerProvided: true,
    },
    addOns: { batteryCount: 2, extendedMonths: 1, oilChangeOutboard: true },
  },
};

describe("hydrating a resumed quote", () => {
  it("restores the boat, the mode and the à-la-carte set", () => {
    const s = hydrateFromResume(listedTown)!;
    expect(s.lengthInput).toBe("24");
    expect(s.hullType).toBe("bowrider");
    expect(s.engineCount).toBe(2);
    expect(s.mode).toBe("alacarte");
    // An array in the token, a Set in the component — the conversion is the
    // whole reason this is not an inline spread.
    expect(s.alacarte).toBeInstanceOf(Set);
    expect([...s.alacarte].sort()).toEqual(["outdoor_storage", "shrink_wrap"]);
    expect(s.ceramicUpgrade).toBe(true);
  });

  it("moves add-ons back onto the logistics form, where they live in the UI", () => {
    const s = hydrateFromResume(listedTown)!;
    expect(s.logisticsValue.batteryCount).toBe(2);
    expect(s.logisticsValue.extendedMonths).toBe(1);
    expect(s.logisticsValue.oilChangeOutboard).toBe(true);
  });

  it("re-derives the band locally for a town from our own list", () => {
    const s = hydrateFromResume(listedTown)!;
    expect(s.logisticsValue.townSlug).toBe("midland");
    expect(s.logisticsValue.placeName).toBe("");
    expect(s.resolvedBand?.band).toBe("local");
    expect(s.resolvedBand?.resolution).toBe("locality");
    expect(s.needsBandLookup).toBe(false);
  });

  it("preserves a false transport leg — 'deliver only' is not 'no transport'", () => {
    const s = hydrateFromResume(listedTown)!;
    expect(s.logisticsValue.pickup).toBe(true);
    expect(s.logisticsValue.delivery).toBe(false);
    expect(s.logisticsValue.trailerProvided).toBe(true);
  });

  it("sends a TYPED town back to the server instead of trusting the old estimate", () => {
    const s = hydrateFromResume({
      ...listedTown,
      selection: {
        ...listedTown.selection!,
        logistics: {
          boatLocation: "marina_ramp",
          townSlug: "Bracebridge",
          transportBand: "regional",
          distanceKm: 68,
          bandResolution: "place_estimate",
          pickup: true,
          delivery: true,
        },
      },
    })!;
    // The picker cannot select a name that is not in the list.
    expect(s.logisticsValue.townSlug).toBe(OTHER_TOWN);
    expect(s.logisticsValue.placeName).toBe("Bracebridge");
    // The stored distance was an estimate when it was made. Reusing it as a
    // resolved band would show a transport price nothing re-derived.
    expect(s.resolvedBand).toBeNull();
    expect(s.needsBandLookup).toBe(true);
    expect(s.bandLookupPlace).toBe("Bracebridge");
  });

  it("resumes as much as it can from a token with no logistics at all", () => {
    const s = hydrateFromResume({
      ok: true,
      boat: BOAT,
      selection: { mode: "bundle", bundleId: "winter_ready" },
    })!;
    expect(s.bundleId).toBe("winter_ready");
    expect(s.logisticsValue.boatLocation).toBeNull();
    expect(s.alacarte.size).toBe(0);
    expect(s.needsBandLookup).toBe(false);
  });

  it("returns null when there is nothing to resume", () => {
    expect(hydrateFromResume({ ok: false, code: "bad_signature" })).toBeNull();
    expect(hydrateFromResume({ ok: true })).toBeNull();
  });
});

describe("where a resumed customer lands", () => {
  it("goes straight to the estimate — that is what the link is for", () => {
    expect(resumeLandingStep(listedTown)).toBe(3);
    expect(resumeBanner(listedTown)).toContain("A1MS-Q-ABC123");
  });

  it("lands an EXPIRED link on step 2 with the boat prefilled, never an error page", () => {
    // An expired token is still one WE signed, so the boat in it is trustworthy;
    // only the prices are stale. The endpoint hands the boat back for exactly
    // this, so nobody has to retype it because their link is a week too old.
    const expired: ResumePayload = { ok: false, code: "expired", boat: BOAT };
    expect(resumeLandingStep(expired)).toBe(2);
    expect(resumeBanner(expired)).toBe(
      "This quote link has expired; here are current prices."
    );

    const s = hydrateFromResume(expired)!;
    expect(s.lengthInput).toBe("24");
    expect(s.hullType).toBe("bowrider");
    expect(s.engineCount).toBe(2);
    // The stale SELECTION is not restored: re-picking is how they see current
    // prices instead of a remembered choice presented as current.
    expect(s.mode).toBeNull();
    expect(s.bundleId).toBeNull();
    expect(s.alacarte.size).toBe(0);
    // And the old reference does not follow a re-priced quote.
    expect(s.ref).toBeUndefined();
  });

  it("falls back to step 1 when an expired link carried no boat at all", () => {
    expect(resumeLandingStep({ ok: false, code: "expired" })).toBe(1);
    expect(hydrateFromResume({ ok: false, code: "expired" })).toBeNull();
  });

  it("says nothing at all for a broken link — no banner about a quote we cannot show", () => {
    expect(resumeBanner({ ok: false, code: "bad_signature" })).toBeNull();
    expect(resumeLandingStep({ ok: false, code: "malformed" })).toBe(1);
  });
});
