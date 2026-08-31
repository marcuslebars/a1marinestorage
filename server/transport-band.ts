// Transport band resolution from a TOWN OR CITY NAME — the fallback for
// "Other / not listed" when the customer's town isn't in the locality list.
//
// It asked for a postal code until 2026-08-31. That never worked: OpenStreetMap
// has no Canadian postal-code coverage, so a bare FSA, a full postal code and a
// free-text postal query all returned an empty result with HTTP 200, and every
// lookup ended as "not found". Place names resolve reliably, so the fix was to
// change the INPUT rather than the provider. Asking for a town is also less
// personal data than asking for a postal code.
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
  /**
   * What the geocoder actually matched, shortened for display.
   *
   * Shown back to the customer because a name is ambiguous in a way a postal
   * code is not — someone typing "London" should be able to see we found the
   * one in Ontario before they accept a transport price based on it.
   */
  place: string;
}

export class TransportBandError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_place" | "not_found" | "provider_unavailable",
  ) {
    super(message);
    this.name = "TransportBandError";
  }
}

/**
 * Letters (accented included), spaces, hyphens, apostrophes and periods — enough
 * for "Sainte-Anne-de-Bellevue" or "St. Catharines", and nothing else. This is a
 * sanity check on a free-text field that becomes a cache key and an outbound
 * query, not an attempt to validate that a place exists; the geocoder answers
 * that.
 *
 * Written with explicit Latin ranges rather than \p{L}, because unicode property
 * escapes need the /u flag and this project compiles with the default ES5
 * target. The ranges cover the accented characters Quebec and Ontario place
 * names actually use.
 */
const PLACE_RE = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ\s'.-]*$/;

const PLACE_MIN = 2;
const PLACE_MAX = 60;

/** Trim, collapse inner whitespace, and reject what cannot be a place name. */
export function normalizePlace(raw: string): string | null {
  const cleaned = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (cleaned.length < PLACE_MIN || cleaned.length > PLACE_MAX) return null;
  if (!PLACE_RE.test(cleaned)) return null;
  return cleaned;
}

/**
 * Nominatim returns a full administrative chain
 * ("Gravenhurst, District Municipality of Muskoka, Muskoka District, Ontario,
 * Canada"). The first two parts are what a person recognises.
 */
export function shortenPlaceLabel(displayName: string): string {
  return displayName.split(",").map((p) => p.trim()).filter(Boolean).slice(0, 2).join(", ");
}

/**
 * Cache key for a normalized place name.
 *
 * Case- and accent-insensitive so "Gravenhurst", "gravenhurst" and "GRAVENHURST"
 * are one cached lookup rather than three requests to a service that asks for at
 * most one per second.
 */
export function placeKey(place: string): string {
  // U+0300–U+036F is the combining-diacritic block NFD decomposes accents into;
  // spelled out for the same ES5-target reason as PLACE_RE above.
  return place.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
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

// Place key -> result. Process-local, cleared on restart, and capped so a
// scripted caller cannot grow it without bound — the real traffic is a handful
// of nearby towns.
const cache = new Map<string, TransportBandResult>();
const CACHE_MAX = 500;

export function __clearTransportBandCache(): void {
  cache.clear();
}

type Fetcher = typeof fetch;

/**
 * Geocode a place name, constrained to Ontario, Canada.
 *
 * The region is appended rather than left to the customer: "Midland" alone can
 * match Michigan or Texas, and a wrong continent would silently produce a
 * `beyond` band and an apologetic "we'll quote this by hand" for someone twenty
 * minutes down the road.
 */
async function geocodePlace(place: string, doFetch: Fetcher): Promise<{ lat: number; lon: number; label: string }> {
  const q = `${place}, Ontario, Canada`;
  const url = `${NOMINATIM}?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(q)}`;
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

  const json = (await res.json().catch(() => null)) as
    | Array<{ lat: string; lon: string; display_name?: string }>
    | null;
  // An empty array now genuinely means "we could not find that town" — unlike
  // the postal query this replaced, which returned empty for every input.
  if (!json?.length) throw new TransportBandError("We couldn't find that town.", "not_found");

  const lat = Number(json[0].lat);
  const lon = Number(json[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new TransportBandError("Geocoding provider returned no usable location.", "provider_unavailable");
  }
  return { lat, lon, label: shortenPlaceLabel(json[0].display_name ?? place) };
}

/**
 * Resolve a town or city name to a transport band.
 *
 * `doFetch` is injectable so the tests never touch the network — hitting
 * Nominatim from CI would be both slow and rude. That injection is also why the
 * postal version's failure went unnoticed for so long, so there is now a
 * separate, opt-in live check: `npm run check:geocoder`.
 */
export async function resolveTransportBand(
  rawPlace: string,
  doFetch: Fetcher = fetch,
): Promise<TransportBandResult> {
  const place = normalizePlace(rawPlace);
  if (!place) {
    throw new TransportBandError("Enter the town or city your boat is in.", "invalid_place");
  }

  const key = placeKey(place);
  const hit = cache.get(key);
  if (hit) return hit;

  const point = await geocodePlace(place, doFetch);
  const distanceKm = estimateRoadKm(point);

  const result: TransportBandResult = {
    // The ENGINE decides the band. This file only supplies the distance.
    band: transportBandForDistanceKm(distanceKm),
    distanceKm,
    estimated: true,
    place: point.label,
  };
  // Drop the oldest entry rather than letting the map grow without bound. Map
  // preserves insertion order, so the first key is the oldest.
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, result);
  return result;
}
