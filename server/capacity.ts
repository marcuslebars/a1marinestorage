// Yard capacity, by Monday-anchored week.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: the "N spots left" counter must never
// be invented. Everything here returns null or an empty list when the capacity
// table has no rows, and the UI shows nothing at all in that case — an
// unseeded database produces silence, not a made-up number.
//
// Weeks are anchored to Monday so a week has one canonical identity. Without
// that, "the week of the 14th" means different rows depending on whether the
// customer picked Tuesday or Thursday, and two people would reserve what looks
// like two different weeks.
import { isConfigured, query } from "./db/index";

export interface CapacityWeek {
  /** ISO date of the Monday, e.g. "2026-09-21". */
  weekStart: string;
  spotsLeft: number;
  full: boolean;
}

export interface CapacitySummary {
  season: string | null;
  /** Total spots left across the season, or null when nothing is seeded. */
  spotsLeft: number | null;
  weeks: CapacityWeek[];
}

const EMPTY: CapacitySummary = { season: null, spotsLeft: null, weeks: [] };

/**
 * The Monday of the week containing `d`, as an ISO date string.
 *
 * UTC throughout. A yard in Ontario and a server in whatever region Railway
 * picked must agree on which week a date belongs to, and local-time arithmetic
 * is how a Monday becomes the previous Sunday.
 */
export function mondayOf(d: Date): string {
  const utc = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  // getUTCDay(): 0 = Sunday. Sunday belongs to the week that STARTED six days
  // ago, not the one about to start.
  const shift = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - shift);
  return utc.toISOString().slice(0, 10);
}

/** True when the string is an ISO date that is also a Monday. */
export function isMondayIso(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && mondayOf(d) === value;
}

interface CacheEntry {
  at: number;
  value: CapacitySummary;
}
let cache: CacheEntry | null = null;

/** Sixty seconds, per the brief. Capacity moves in bookings, not milliseconds. */
const CACHE_MS = 60_000;

export function __clearCapacityCache(): void {
  cache = null;
}

/**
 * Read the season's capacity.
 *
 * Returns EMPTY — not zero — when there is no database or no seeded season.
 * Zero would mean "we are full", which is a very different thing to tell a
 * customer than "we have not published availability".
 */
export async function getCapacity(season?: string): Promise<CapacitySummary> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  if (!isConfigured()) return EMPTY;

  try {
    // Without an explicit season, take the latest one that has rows, so a new
    // season becomes live by being seeded rather than by a deploy.
    const seasonRow = season
      ? { season }
      : (
          await query<{ season: string }>(
            "select season from capacity order by season desc limit 1"
          )
        ).rows[0];
    if (!seasonRow?.season) return EMPTY;

    const res = await query<{
      week_start: string;
      spots_total: number;
      spots_reserved: number;
    }>(
      `select to_char(week_start, 'YYYY-MM-DD') as week_start,
              spots_total, spots_reserved
         from capacity
        where season = $1
        order by week_start`,
      [seasonRow.season]
    );
    if (!res.ok || res.rowCount === 0) return EMPTY;

    const weeks: CapacityWeek[] = res.rows.map(r => {
      // A row that somehow over-reserved must not report NEGATIVE spots left.
      const left = Math.max(0, r.spots_total - r.spots_reserved);
      return { weekStart: r.week_start, spotsLeft: left, full: left <= 0 };
    });

    const value: CapacitySummary = {
      season: seasonRow.season,
      spotsLeft: weeks.reduce((sum, w) => sum + w.spotsLeft, 0),
      weeks,
    };
    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    // A capacity read is decoration. It must never be the reason a page fails.
    console.error(
      "[capacity] read failed (showing nothing):",
      err instanceof Error ? err.message : String(err)
    );
    return EMPTY;
  }
}

/**
 * Should the "N spots left" line be shown at all?
 *
 * Only when the number is real AND small enough to mean something. "412 spots
 * left" is not scarcity, it is noise; and above the threshold the line makes
 * the yard look empty. The brief's window is 1–40.
 */
export const SPOTS_LEFT_MAX_SHOWN = 40;

export function shouldShowSpotsLeft(spotsLeft: number | null): boolean {
  return (
    typeof spotsLeft === "number" &&
    spotsLeft > 0 &&
    spotsLeft <= SPOTS_LEFT_MAX_SHOWN
  );
}

/**
 * Take one spot for a week, when a quote becomes reserved.
 *
 * Conditional on availability in the UPDATE itself, so two simultaneous
 * bookings for the last spot cannot both succeed — the second one matches no
 * row. Returns false when the week is full or unknown, and the caller decides
 * what to do about it; overbooking silently would put two boats in one space.
 */
export async function reserveSpot(weekStart: string): Promise<boolean> {
  if (!isConfigured() || !isMondayIso(weekStart)) return false;
  try {
    const res = await query(
      `update capacity
          set spots_reserved = spots_reserved + 1
        where week_start = $1
          and spots_reserved < spots_total
        returning week_start`,
      [weekStart]
    );
    if (res.ok && res.rowCount > 0) {
      __clearCapacityCache();
      return true;
    }
    return false;
  } catch (err) {
    console.error(
      "[capacity] could not reserve a spot:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}
