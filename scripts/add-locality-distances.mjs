/**
 * One-shot: insert the ratified `distanceKm` into each locality entry.
 *
 * Distances are RATIFIED business data, not derived at runtime:
 *   - ten towns where the Nominatim estimate and the recorded driveMin agreed
 *   - three ratified by Marcus where they did not (Honey Harbour and
 *     Waubaushene are regional by drive time; Tiny is 5 km — Nominatim had
 *     returned the township centroid, but the yard is IN Tiny)
 *
 * We store DISTANCE, not band. The band is a pricing decision and belongs to the
 * engine; storing distance means a future boundary change re-bands every town
 * automatically instead of leaving thirteen stale labels behind.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../shared/localities.ts", import.meta.url);

const DISTANCE_KM = {
  midland: 6,
  penetanguishene: 6,
  tiny: 5,
  "wasaga-beach": 29,
  "victoria-harbour": 17,
  "port-mcnicoll": 13,
  "honey-harbour": 35,
  lafontaine: 12,
  "balm-beach": 7,
  waubaushene: 26,
  coldwater: 29,
  orillia: 54,
  barrie: 53,
};

let text = readFileSync(FILE, "utf8");
let inserted = 0;

for (const [slug, km] of Object.entries(DISTANCE_KM)) {
  if (new RegExp(`slug:\\s*"${slug}"[\\s\\S]{0,600}?distanceKm:`).test(text)) {
    console.log(`skip ${slug} — already has distanceKm`);
    continue;
  }
  const re = new RegExp(`(slug:\\s*"${slug}"[\\s\\S]{0,600}?driveMin:\\s*\\d+,)`);
  const next = text.replace(re, `$1\n    distanceKm: ${km},`);
  if (next === text) {
    console.error(`NO MATCH: ${slug}`);
    continue;
  }
  text = next;
  inserted += 1;
}

writeFileSync(FILE, text);
console.log(`inserted distanceKm for ${inserted} of ${Object.keys(DISTANCE_KM).length} localities`);
