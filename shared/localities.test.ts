import { describe, expect, it } from "vitest";

import {
  LOCALITIES,
  localitiesWithBands,
  localityBySlug,
  transportBandForLocality,
} from "./localities";

/**
 * RATIFIED BANDS.
 *
 * These decide what a customer pays to have their boat collected, so they are
 * pinned rather than left to drift. Ten came from geocoding; three were ratified
 * against the recorded drive time where the two disagreed:
 *
 *   Honey Harbour  straight-line said local, but it is up a peninsula and the
 *                  recorded tow is 38 min — REGIONAL
 *   Waubaushene    borderline at 28 min — REGIONAL
 *   Tiny           geocoding returned the township centroid (19 km); the yard is
 *                  IN Tiny, so 5 km
 *
 * A change to a distance here, or to a band boundary in the engine, will fail
 * this test rather than silently re-price a town.
 */
const RATIFIED: Record<string, "local" | "regional" | "extended"> = {
  midland: "local",
  penetanguishene: "local",
  tiny: "local",
  "wasaga-beach": "regional",
  "victoria-harbour": "local",
  "port-mcnicoll": "local",
  "honey-harbour": "regional",
  lafontaine: "local",
  "balm-beach": "local",
  waubaushene: "regional",
  coldwater: "regional",
  orillia: "regional",
  barrie: "regional",
};

describe("every locality has a ratified band", () => {
  it("covers every town, with none left unratified", () => {
    expect(LOCALITIES.map((l) => l.slug).sort()).toEqual(Object.keys(RATIFIED).sort());
  });

  it("resolves each town to its ratified band", () => {
    for (const loc of LOCALITIES) {
      expect(transportBandForLocality(loc), `${loc.slug} (${loc.distanceKm} km)`).toBe(
        RATIFIED[loc.slug],
      );
    }
  });

  it("the two boundary calls sit on the far side of local, deliberately", () => {
    // Both look local by straight-line distance. The recorded tow times say
    // otherwise, and the tow time is someone who actually drove it.
    expect(transportBandForLocality(localityBySlug("honey-harbour")!)).toBe("regional");
    expect(transportBandForLocality(localityBySlug("waubaushene")!)).toBe("regional");
  });

  it("Tiny is a few km, not a township centroid", () => {
    // The yard is in Tiny. A geocoder returned 19 km for the township; that
    // would have been wrong on the page as well as in the band.
    const tiny = localityBySlug("tiny")!;
    expect(tiny.distanceKm).toBeLessThanOrEqual(10);
    expect(tiny.distanceKm).toBeLessThan(tiny.driveMin * 2);
  });
});

describe("distances are plausible against the recorded tow times", () => {
  it("no town's distance implies an impossible towing speed", () => {
    // Guards the failure that actually happened: a geocoder returning somewhere
    // else entirely (Tiny came back as 19 km for a 5-minute drive — 228 km/h
    // towing a boat).
    //
    // Upper bound only, deliberately. A LOW km-per-minute is not anomalous —
    // Midland is 6 km but a 15-minute tow through town, which is genuinely slow
    // and genuinely correct. Asserting a minimum speed would be asserting a road
    // model this repo has no grounds for.
    for (const loc of LOCALITIES) {
      const kmPerMinute = loc.distanceKm / loc.driveMin;
      expect(
        kmPerMinute,
        `${loc.slug}: ${loc.distanceKm}km in ${loc.driveMin}min = ${Math.round(kmPerMinute * 60)}km/h`,
      ).toBeLessThan(2);
    }
  });

  it("every distance is a positive whole number of km", () => {
    for (const loc of LOCALITIES) {
      expect(Number.isInteger(loc.distanceKm), loc.slug).toBe(true);
      expect(loc.distanceKm, loc.slug).toBeGreaterThan(0);
    }
  });
});

describe("the town select payload", () => {
  it("carries slug, name, distance and band for every town", () => {
    const rows = localitiesWithBands();
    expect(rows).toHaveLength(LOCALITIES.length);
    for (const row of rows) {
      expect(row.slug).toBeTruthy();
      expect(row.name).toBeTruthy();
      expect(row.distanceKm).toBeGreaterThan(0);
      expect(["local", "regional", "extended", "beyond"]).toContain(row.band);
    }
  });

  it("no listed town falls beyond the furthest band", () => {
    // Every town we advertise to must be quotable; a listed town resolving to
    // `beyond` would offer a transport row with no price.
    for (const row of localitiesWithBands()) {
      expect(row.band, row.slug).not.toBe("beyond");
    }
  });

  it("returns null for an unlisted slug, which is the Other path", () => {
    expect(localityBySlug("atlantis")).toBeNull();
  });
});
