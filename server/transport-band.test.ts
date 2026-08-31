import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TransportBandError,
  __clearTransportBandCache,
  estimateRoadKm,
  normalizePlace,
  placeKey,
  resolveTransportBand,
  shortenPlaceLabel,
} from "./transport-band";

/** A stub Nominatim that never touches the network. */
const geocoderAt = (lat: number, lon: number, name = "Somewhere, Simcoe County, Ontario, Canada") =>
  vi.fn(
    async () =>
      new Response(JSON.stringify([{ lat: String(lat), lon: String(lon), display_name: name }]), {
        status: 200,
      }),
  );

const emptyGeocoder = vi.fn(async () => new Response("[]", { status: 200 }));

beforeEach(() => {
  __clearTransportBandCache();
});

describe("place validation", () => {
  it("accepts the shapes Ontario and Quebec town names actually take", () => {
    for (const p of ["Gravenhurst", "Parry Sound", "St. Catharines", "Sainte-Anne-de-Bellevue", "Val-d'Or", "Trois-Rivières"]) {
      expect(normalizePlace(p), p).not.toBeNull();
    }
  });

  it("collapses whitespace so one town is one cache entry", () => {
    expect(normalizePlace("  Parry   Sound  ")).toBe("Parry Sound");
  });

  it("rejects what cannot be a town name", () => {
    // Digits rule out someone typing a postal code into the box, which is the
    // most likely wrong input now that the field used to ask for one.
    for (const p of ["", " ", "a", "L4R 1A1", "123", "<script>", "Town; DROP TABLE", "x".repeat(61)]) {
      expect(normalizePlace(p), p).toBeNull();
    }
  });

  it("refuses to guess on an unusable name", async () => {
    await expect(resolveTransportBand("", geocoderAt(44.7, -79.9))).rejects.toMatchObject({
      code: "invalid_place",
    });
  });
});

describe("cache key", () => {
  it("folds case and accents together", () => {
    expect(placeKey("Trois-Rivières")).toBe(placeKey("TROIS-RIVIERES"));
    expect(placeKey("Gravenhurst")).toBe("gravenhurst");
  });
});

describe("matched-place label", () => {
  it("keeps the recognisable part of the administrative chain", () => {
    expect(
      shortenPlaceLabel("Gravenhurst, District Municipality of Muskoka, Muskoka District, Ontario, Canada"),
    ).toBe("Gravenhurst, District Municipality of Muskoka");
  });

  it("survives a label with no commas", () => {
    expect(shortenPlaceLabel("Midland")).toBe("Midland");
  });
});

describe("distance estimate", () => {
  it("is zero at the yard itself", () => {
    expect(estimateRoadKm({ lat: 44.7269, lon: -79.9403 })).toBe(0);
  });

  it("inflates the straight line as a road-distance allowance", () => {
    // Roughly 1 degree of latitude north ≈ 111 km straight, ≈ 139 km by road.
    const km = estimateRoadKm({ lat: 45.7269, lon: -79.9403 });
    expect(km).toBeGreaterThan(130);
    expect(km).toBeLessThan(145);
  });

  it("grows with distance", () => {
    expect(estimateRoadKm({ lat: 45.5, lon: -79.9403 })).toBeGreaterThan(
      estimateRoadKm({ lat: 44.8, lon: -79.9403 }),
    );
  });
});

/**
 * The band is the ENGINE's call. These assert the wiring, not the thresholds —
 * the boundaries themselves are tested in the engine, and duplicating them here
 * would create a second place to update when a band moves.
 */
describe("band resolution", () => {
  it("resolves a nearby town to a near band", async () => {
    const r = await resolveTransportBand("Midland", geocoderAt(44.75, -79.88));
    expect(r.band).toBe("local");
    expect(r.estimated).toBe(true);
  });

  it("resolves a distant town to beyond", async () => {
    // Far enough that no flat band applies; the caller must fall back to a hand
    // quote rather than billing a trip.
    const r = await resolveTransportBand("Kingston", geocoderAt(44.23, -76.48));
    expect(r.band).toBe("beyond");
  });

  it("always marks the distance as an estimate", async () => {
    // Nominatim geocodes, it does not route. Saying otherwise would overstate
    // what we know, and the band is confirmed at booking.
    expect((await resolveTransportBand("Elmvale", geocoderAt(44.73, -79.94))).estimated).toBe(true);
  });

  it("returns what the geocoder matched, for the customer to check", async () => {
    // A typed name is ambiguous in a way a postal code was not: "London" and
    // "Midland" both exist elsewhere, and a wrong match silently changes a price.
    const r = await resolveTransportBand("London", geocoderAt(42.98, -81.25, "London, Southwestern Ontario, Ontario, Canada"));
    expect(r.place).toBe("London, Southwestern Ontario");
  });
});

describe("the outbound query", () => {
  it("constrains the search to Ontario, Canada", async () => {
    const geo = geocoderAt(44.75, -79.88);
    await resolveTransportBand("Midland", geo);
    const url = decodeURIComponent(String(geo.mock.calls[0][0]));
    // Unqualified, "Midland" also matches Michigan and Texas — and a wrong
    // continent would quietly become a `beyond` band for a neighbour.
    expect(url).toContain("Midland, Ontario, Canada");
    expect(url).toContain("countrycodes=ca");
  });

  it("identifies itself to the provider, per their usage policy", async () => {
    const geo = geocoderAt(44.75, -79.88);
    await resolveTransportBand("Midland", geo);
    const init = geo.mock.calls[0][1] as RequestInit;
    expect(String((init.headers as Record<string, string>)["User-Agent"])).toContain("a1marinestorage.ca");
  });
});

describe("caching", () => {
  it("hits the provider once per town, whatever the casing", async () => {
    const geo = geocoderAt(44.75, -79.88);
    await resolveTransportBand("Gravenhurst", geo);
    await resolveTransportBand("  gravenhurst ", geo);
    // Nominatim asks for at most one request a second, so repeat traffic must
    // not reach them.
    expect(geo).toHaveBeenCalledTimes(1);
  });

  it("looks up different towns separately", async () => {
    const geo = geocoderAt(44.75, -79.88);
    await resolveTransportBand("Gravenhurst", geo);
    await resolveTransportBand("Bracebridge", geo);
    expect(geo).toHaveBeenCalledTimes(2);
  });
});

describe("failure modes stay distinguishable", () => {
  it("a provider outage is NOT reported as a bad town", async () => {
    // The customer's input was fine; telling them otherwise sends them hunting
    // for a typo that isn't there.
    const down = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    await expect(resolveTransportBand("Gravenhurst", down)).rejects.toMatchObject({
      code: "provider_unavailable",
    });
  });

  it("an HTTP error from the provider is an outage, not a not-found", async () => {
    const five = vi.fn(async () => new Response("nope", { status: 503 }));
    await expect(resolveTransportBand("Gravenhurst", five)).rejects.toMatchObject({
      code: "provider_unavailable",
    });
  });

  it("an empty result is a genuine not-found", async () => {
    // This is the assertion that was TRUE BUT USELESS under the postal version:
    // the provider returned empty for every input, so "not found" was the answer
    // to everything. It only means something now because place names resolve —
    // which is what check-geocoder.mjs verifies against the live service.
    await expect(resolveTransportBand("Nowheresville", emptyGeocoder)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("carries a typed code so the caller can choose its message", async () => {
    try {
      await resolveTransportBand("4", emptyGeocoder);
      throw new Error("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TransportBandError);
      expect((err as TransportBandError).code).toBe("invalid_place");
    }
  });

  it("does not cache a failure — a later retry can still succeed", async () => {
    await expect(resolveTransportBand("Gravenhurst", emptyGeocoder)).rejects.toThrow();
    const good = geocoderAt(44.75, -79.88);
    expect((await resolveTransportBand("Gravenhurst", good)).band).toBe("local");
    expect(good).toHaveBeenCalledTimes(1);
  });
});
