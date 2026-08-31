/**
 * Derive one-way distance from the yard for each locality, using Nominatim.
 *
 * Run once by a developer; the results are committed into shared/localities.ts as
 * `distanceKm`. This is NOT a runtime path — the calculator reads the committed
 * numbers and never geocodes a listed town.
 *
 * WHY DISTANCE AND NOT BAND: the band is a pricing decision and belongs to the
 * engine (transportBandForDistanceKm). What this repo stores is geography — how
 * far a town is — which is a verifiable fact, not a rate. Change a band boundary
 * in the engine and every town re-bands automatically, with no edit here.
 *
 * Great-circle x 1.25 as a road-distance estimate: Nominatim geocodes but does
 * not route. The factor is the usual detour allowance; these are estimates and
 * the UI says so.
 *
 * Nominatim etiquette: a real User-Agent and >=1 req/sec, per their usage policy.
 *
 * Usage: node scripts/derive-locality-distances.mjs
 */

// 639 Concession Road 16 East, Tiny, ON — the yard.
const YARD = { lat: 44.7269, lon: -79.9403 };

const TOWNS = [
  "midland", "penetanguishene", "tiny", "wasaga-beach", "victoria-harbour",
  "port-mcnicoll", "honey-harbour", "lafontaine", "balm-beach", "waubaushene",
  "coldwater", "orillia", "barrie",
];

const UA = "a1marinestorage-locality-distances/1.0 (contact@a1marinestorage.ca)";

/** Great-circle km. */
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(town) {
  const q = `${town.replace(/-/g, " ")}, Ontario, Canada`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`${town}: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.length) throw new Error(`${town}: no result`);
  return { lat: Number(json[0].lat), lon: Number(json[0].lon) };
}

const out = [];
for (const town of TOWNS) {
  try {
    const point = await geocode(town);
    const straight = haversineKm(YARD, point);
    const road = Math.round(straight * 1.25);
    out.push({ town, straightKm: Math.round(straight * 10) / 10, distanceKm: road });
    console.log(`${town.padEnd(20)} straight ${straight.toFixed(1).padStart(6)} km  ->  road est ${String(road).padStart(4)} km`);
  } catch (err) {
    console.error(`${town.padEnd(20)} FAILED: ${err.message}`);
  }
  await sleep(1100); // Nominatim: max 1 req/sec
}

console.log("\n--- paste-ready ---");
for (const r of out) console.log(`  ${r.town}: ${r.distanceKm},`);
