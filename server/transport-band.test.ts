import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TransportBandError,
  __clearTransportBandCache,
  estimateRoadKm,
  fsaOf,
  normalizePostal,
  resolveTransportBand,
} from "./transport-band";

/** A stub Nominatim that never touches the network. */
const geocoderAt = (lat: number, lon: number) =>
  vi.fn(async () => new Response(JSON.stringify([{ lat: String(lat), lon: String(lon) }]), { status: 200 }));

const emptyGeocoder = vi.fn(async () => new Response("[]", { status: 200 }));

beforeEach(() => {
  __clearTransportBandCache();
});

describe("postal validation", () => {
  it("accepts full and FSA-only codes, tolerating case and spacing", () => {
    for (const p of ["L4R 1A1", "l4r1a1", "L4R", "l4r", "K1A  0B1"]) {
      expect(normalizePostal(p), p).not.toBeNull();
    }
  });

  it("rejects anything that isn't a Canadian postal code", () => {
    // Including US ZIPs and the letters Canada Post never uses (D F I O Q U).
    for (const p of ["90210", "SW1A 1AA", "D1A 1A1", "", "  ", "L4R 1A1 extra", "1L4 R1A"]) {
      expect(normalizePostal(p), p).toBeNull();
    }
  });

  it("takes the FSA — the first three characters", () => {
    expect(fsaOf("L4R 1A1")).toBe("L4R");
    expect(fsaOf("L4R")).toBe("L4R");
  });

  it("refuses to guess on a bad postal code", () => {
    return expect(resolveTransportBand("nonsense", geocoderAt(44.7, -79.9))).rejects.toThrow(
      /Canadian postal code/,
    );
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
    const near = estimateRoadKm({ lat: 44.8, lon: -79.9403 });
    const far = estimateRoadKm({ lat: 45.5, lon: -79.9403 });
    expect(far).toBeGreaterThan(near);
  });
});

/**
 * The band is the ENGINE's call. These assert the wiring, not the thresholds —
 * the boundaries themselves are tested in the engine, and duplicating them here
 * would create a second place to update when a band moves.
 */
describe("band resolution", () => {
  it("resolves a nearby postal code to a near band", async () => {
    const r = await resolveTransportBand("L4R 1A1", geocoderAt(44.75, -79.88));
    expect(r.band).toBe("local");
    expect(r.estimated).toBe(true);
    expect(r.distanceKm).toBeGreaterThanOrEqual(0);
  });

  it("resolves a distant postal code to beyond", async () => {
    // Far enough that no flat band applies; the caller must fall back to a hand
    // quote rather than billing a trip.
    const r = await resolveTransportBand("K7L 3N6", geocoderAt(44.23, -76.48));
    expect(r.band).toBe("beyond");
  });

  it("always marks the distance as an estimate", async () => {
    const r = await resolveTransportBand("L9M 1R2", geocoderAt(44.73, -79.94));
    // Nominatim geocodes, it does not route. Saying otherwise would overstate
    // what we know, and the band is confirmed at booking.
    expect(r.estimated).toBe(true);
  });
});

describe("caching", () => {
  it("hits the provider once per FSA", async () => {
    const geo = geocoderAt(44.75, -79.88);
    await resolveTransportBand("L4R 1A1", geo);
    await resolveTransportBand("L4R 9Z9", geo);
    // Same FSA, different full codes — one lookup. Nominatim asks for at most
    // one request a second, so repeat traffic must not reach them.
    expect(geo).toHaveBeenCalledTimes(1);
  });

  it("looks up different FSAs separately", async () => {
    const geo = geocoderAt(44.75, -79.88);
    await resolveTransportBand("L4R 1A1", geo);
    await resolveTransportBand("L9M 1R2", geo);
    expect(geo).toHaveBeenCalledTimes(2);
  });

  it("sends only the FSA, never the full postal code", async () => {
    const geo = geocoderAt(44.75, -79.88);
    await resolveTransportBand("L4R 1A1", geo);
    const url = String(geo.mock.calls[0][0]);
    expect(url).toContain("L4R");
    // The last three characters identify a block of addresses; the first three
    // already answer the question at this precision.
    expect(url).not.toContain("1A1");
  });

  it("identifies itself to the provider, per their usage policy", async () => {
    const geo = geocoderAt(44.75, -79.88);
    await resolveTransportBand("L4R 1A1", geo);
    const init = geo.mock.calls[0][1] as RequestInit;
    expect(String((init.headers as Record<string, string>)["User-Agent"])).toContain("a1marinestorage.ca");
  });
});

describe("failure modes stay distinguishable", () => {
  it("a provider outage is NOT reported as a bad postal code", async () => {
    // The customer's input was fine; telling them otherwise sends them hunting
    // for a typo that isn't there.
    const down = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    await expect(resolveTransportBand("L4R 1A1", down)).rejects.toMatchObject({
      code: "provider_unavailable",
    });
  });

  it("an HTTP error from the provider is an outage, not a not-found", async () => {
    const five = vi.fn(async () => new Response("nope", { status: 503 }));
    await expect(resolveTransportBand("L4R 1A1", five)).rejects.toMatchObject({
      code: "provider_unavailable",
    });
  });

  it("an empty result is a genuine not-found", async () => {
    await expect(resolveTransportBand("L4R 1A1", emptyGeocoder)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("carries a typed code so the caller can choose its message", async () => {
    try {
      await resolveTransportBand("bad", emptyGeocoder);
      throw new Error("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TransportBandError);
      expect((err as TransportBandError).code).toBe("invalid_postal");
    }
  });

  it("does not cache a failure — a later retry can still succeed", async () => {
    await expect(resolveTransportBand("L4R 1A1", emptyGeocoder)).rejects.toThrow();
    const good = geocoderAt(44.75, -79.88);
    const r = await resolveTransportBand("L4R 1A1", good);
    expect(r.band).toBe("local");
    expect(good).toHaveBeenCalledTimes(1);
  });
});
