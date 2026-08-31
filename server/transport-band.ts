// Transport band resolution from a postal code — the fallback for "Other / not
// listed" when the customer's town isn't in the locality list.
//
// SERVER-SIDE ONLY. Nominatim asks for a real User-Agent and at most one request
// per second; neither is enforceable from a browser, and geocoding from the
// client would also let anyone use the site as a free proxy.
//
// THE BAND IS NOT DECIDED HERE. This module turns a postal code into a distance;
// the engine turns a distance into a band (transportBandForDistanceKm). A km
// threshold decides what a customer pays, so it stays a pricing rule in the
// engine — this file must never contain one.
import { transportBandForDistanceKm, type TransportBand } from "@a1/pricing-engine";

/** 639 Concession Road 16 East, Tiny, ON — the yard. */
const YARD = { lat: 44.7269, lon: -79.9403 };

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "a1marinestorage.ca transport-band lookup (contact@a1marinestorage.ca)";

/**
 * Great-circle distance is shorter than the road. 1.25 is the usual detour
 * allowance and is why every response is flagged `estimated` — Nominatim
 * geocodes but does not route. A band this lands on is confirmed at booking,
 * which the UI says out loud.
 */
const ROAD_FACTOR = 1.25;

const REQUEST_TIMEOUT_MS = 4000;

export interface TransportBandResult {
  band: TransportBand;
  distanceKm: number;
  /** Always true on this path: the distance is a road-distance ESTIMATE. */
  estimated: boolean;
}

export class TransportBandError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_postal" | "not_found" | "provider_unavailable",
  ) {
    super(message);
    this.name = "TransportBandError";
  }
}

/** Canadian postal code, full (K1A 0B1) or FSA-only (K1A). Case/space tolerant. */
const POSTAL_RE = /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ](\s?\d[ABCEGHJKLMNPRSTVWXYZ]\d)?$/i;

export function normalizePostal(raw: string): string | null {
  const cleaned = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!POSTAL_RE.test(cleaned)) return null;
  return cleaned;
}

/**
 * The FSA — first three characters.
 *
 * Everything is cached and looked up by FSA rather than full postal code: an FSA
 * covers a few km at most, which is far finer than the band boundaries it feeds,
 * and it means one lookup serves every customer in that area. It also avoids
 * sending a customer's full postal code to a third party when the first three
 * characters answer the question.
 */
export function fsaOf(postal: string): string {
  return postal.slice(0, 3);
}

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Road-distance estimate from a geocoded point, rounded to whole km. */
export function estimateRoadKm(point: { lat: number; lon: number }): number {
  return Math.round(haversineKm(YARD, point) * ROAD_FACTOR);
}

// FSA -> result. Process-local and unbounded-but-tiny: there are ~1600 Canadian
// FSAs and we will only ever see a handful. Cleared on restart, which is fine.
const cache = new Map<string, TransportBandResult>();

export function __clearTransportBandCache(): void {
  cache.clear();
}

type Fetcher = typeof fetch;

async function geocodeFsa(fsa: string, doFetch: Fetcher): Promise<{ lat: number; lon: number }> {
  const url = `${NOMINATIM}?format=json&limit=1&countrycodes=ca&postalcode=${encodeURIComponent(fsa)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await doFetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      signal: controller.signal,
    });
  } catch {
    // Timeout or network. Deliberately not surfaced as "bad postal code" — the
    // customer's input was fine and telling them otherwise would send them
    // hunting for a typo that isn't there.
    throw new TransportBandError("Geocoding provider unavailable.", "provider_unavailable");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new TransportBandError("Geocoding provider unavailable.", "provider_unavailable");

  const json = (await res.json().catch(() => null)) as Array<{ lat: string; lon: string }> | null;
  if (!json?.length) throw new TransportBandError("No location found for that postal code.", "not_found");

  const lat = Number(json[0].lat);
  const lon = Number(json[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new TransportBandError("Geocoding provider returned no usable location.", "provider_unavailable");
  }
  return { lat, lon };
}

/**
 * Resolve a postal code to a transport band.
 *
 * `doFetch` is injectable so the tests never touch the network — hitting
 * Nominatim from CI would be both slow and rude.
 */
export async function resolveTransportBand(
  rawPostal: string,
  doFetch: Fetcher = fetch,
): Promise<TransportBandResult> {
  const postal = normalizePostal(rawPostal);
  if (!postal) {
    throw new TransportBandError("That doesn't look like a Canadian postal code.", "invalid_postal");
  }

  const fsa = fsaOf(postal);
  const hit = cache.get(fsa);
  if (hit) return hit;

  const point = await geocodeFsa(fsa, doFetch);
  const distanceKm = estimateRoadKm(point);

  const result: TransportBandResult = {
    // The ENGINE decides the band. This file only supplies the distance.
    band: transportBandForDistanceKm(distanceKm),
    distanceKm,
    estimated: true,
  };
  cache.set(fsa, result);
  return result;
}

/*
 * KNOWN DEFECT — the postal path does not resolve against the live provider.
 *
 * Verified 2026-08-31 against nominatim.openstreetmap.org: a bare FSA ("L4R"),
 * a full postal code ("L4R 1A1") and a free-text FSA query all return an EMPTY
 * result array with HTTP 200. OSM simply has no Canadian postal-code coverage;
 * place names ("Midland, Ontario") resolve fine.
 *
 * So every postal lookup ends as `not_found`, and the calculator's town list is
 * carrying the whole feature. The unit tests do not catch this because they
 * inject `doFetch` — which was the right call for CI (hitting Nominatim from a
 * test suite is slow and rude), but it means the real provider's behaviour was
 * never exercised.
 *
 * The fix is a change of input, not of provider: ask for a TOWN OR CITY and
 * geocode "<name>, Ontario, Canada", which Nominatim answers reliably. That is
 * also less personal data than a postal code. It needs a request-field rename
 * (postalCode -> place), the matching envelope field, and new tests, so it is
 * left as its own change rather than folded into the Step 2 UI.
 *
 * Until then the UI reports a lookup failure rather than blaming the customer's
 * typing, and always offers the town list as the way through.
 */
