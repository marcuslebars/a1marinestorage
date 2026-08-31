#!/usr/bin/env node
/**
 * Does the geocoder still answer the questions we ask it?
 *
 * This exists because it once did not, and nothing noticed. The transport
 * lookup asked Nominatim for Canadian POSTAL CODES, which OpenStreetMap has no
 * coverage of — every request came back HTTP 200 with an empty array, so every
 * lookup ended as "no location found". The unit tests inject `doFetch` and so
 * never touched the live service; the failure was invisible from inside the
 * suite and only showed up when a customer tried it.
 *
 * So this is deliberately NOT part of `npm test`: it hits a third-party service
 * over the network, which is slow, rude in CI, and would fail the build for
 * reasons that are not the code's fault. Run it by hand when the lookup is
 * changed, or when someone reports that it stopped working:
 *
 *     npm run check:geocoder
 *
 * It respects Nominatim's one-request-per-second policy and takes ~10s.
 */
import { resolveTransportBand } from "../server/transport-band.ts";

const PAUSE_MS = 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry once on `provider_unavailable`.
 *
 * Nominatim rate-limits bursts, and it does so often enough that a single
 * throttled request would otherwise report "the transport lookup is broken" when
 * it is fine. A check that cries wolf gets ignored, which would defeat the
 * purpose of having it.
 */
async function lookup(place) {
  try {
    return await resolveTransportBand(place);
  } catch (err) {
    if (err?.code !== "provider_unavailable") throw err;
    await sleep(3000);
    return resolveTransportBand(place);
  }
}

/** Real towns customers actually come from, plus a control that must NOT resolve. */
const CASES = [
  { place: "Gravenhurst", expect: "resolves" },
  { place: "Bracebridge", expect: "resolves" },
  { place: "Collingwood", expect: "resolves" },
  { place: "Parry Sound", expect: "resolves" },
  // The control. If this "resolves", the geocoder is matching anything it is
  // handed, and a not-found can no longer be trusted to mean not-found.
  { place: "Qwertyuiopasdf", expect: "not_found" },
];

let failures = 0;

for (const [i, c] of CASES.entries()) {
  if (i > 0) await sleep(PAUSE_MS);
  try {
    const r = await lookup(c.place);
    if (c.expect === "not_found") {
      console.error(`FAIL  ${c.place}: expected not_found, got ${r.band} (${r.distanceKm} km)`);
      failures++;
    } else {
      console.log(`ok    ${c.place.padEnd(14)} -> ${r.band.padEnd(9)} ~${r.distanceKm} km   (${r.place})`);
    }
  } catch (err) {
    const code = err?.code ?? "unknown";
    if (c.expect === "not_found" && code === "not_found") {
      console.log(`ok    ${c.place.padEnd(14)} -> not_found, as expected`);
    } else {
      console.error(`FAIL  ${c.place}: ${code} — ${err?.message ?? err}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} of ${CASES.length} checks failed. The transport lookup is not working.`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} checks passed — the geocoder answers what we ask it.`);
