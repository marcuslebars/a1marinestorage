// Seed the capacity table for a season.
//
// EDIT THE NUMBERS BELOW BEFORE RUNNING THIS AGAINST PRODUCTION. The values
// here are placeholders and are deliberately NOT a guess at the yard's real
// capacity: the counter they drive appears on customer-facing pages, and the
// rule is that it must never be invented. A wrong seed is worse than an empty
// table, because an empty table shows nothing while a wrong one lies
// confidently.
//
// Idempotent: re-running updates spots_total and leaves spots_reserved alone,
// so adjusting capacity mid-season cannot wipe existing bookings.
//
//   pnpm capacity:seed -- --dry-run       # print what it would write
//   pnpm capacity:seed                    # write it
//
import { closePool, isConfigured, query } from "../server/db/index.js";

// ── EDIT ME ──────────────────────────────────────────────────────────────────
const SEASON = "2026-27";
/** First and last drop-off week (any date inside the week; anchored to Monday). */
const FIRST_WEEK = "2026-09-15";
const LAST_WEEK = "2026-11-15";
/** Boats the yard can take in one week. PLACEHOLDER — confirm before running. */
const SPOTS_PER_WEEK = 12;
/** Haul-outs bookable in one week, if the yard tracks that separately. */
const HAULOUT_SLOTS_PER_WEEK = 0;
// ─────────────────────────────────────────────────────────────────────────────

const dryRun = process.argv.includes("--dry-run");

function mondayOf(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}

function weeksBetween(firstIso, lastIso) {
  const out = [];
  const end = mondayOf(lastIso);
  let cursor = mondayOf(firstIso);
  while (cursor <= end) {
    out.push(cursor);
    const d = new Date(`${cursor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    cursor = d.toISOString().slice(0, 10);
  }
  return out;
}

const weeks = weeksBetween(FIRST_WEEK, LAST_WEEK);

console.log(
  `[seed-capacity] season ${SEASON}: ${weeks.length} weeks, ` +
    `${SPOTS_PER_WEEK} spots each (${weeks.length * SPOTS_PER_WEEK} total)`
);
console.log(`[seed-capacity] ${weeks[0]} → ${weeks[weeks.length - 1]}`);

if (dryRun) {
  for (const w of weeks) console.log(`  ${w}  spots_total=${SPOTS_PER_WEEK}`);
  console.log("[seed-capacity] --dry-run: nothing written.");
  process.exit(0);
}

if (!isConfigured()) {
  console.error("[seed-capacity] DATABASE_URL is not set — nothing to do.");
  process.exit(1);
}

let written = 0;
for (const weekStart of weeks) {
  // spots_reserved is NOT touched on conflict: re-seeding to change capacity
  // must never discard bookings that already exist.
  const res = await query(
    `insert into capacity (week_start, season, spots_total, haulout_slots)
     values ($1, $2, $3, $4)
     on conflict (week_start) do update
       set season = excluded.season,
           spots_total = excluded.spots_total,
           haulout_slots = excluded.haulout_slots
     returning week_start`,
    [weekStart, SEASON, SPOTS_PER_WEEK, HAULOUT_SLOTS_PER_WEEK]
  );
  if (res.ok && res.rowCount > 0) written += 1;
}

console.log(`[seed-capacity] wrote ${written}/${weeks.length} weeks.`);
await closePool();
