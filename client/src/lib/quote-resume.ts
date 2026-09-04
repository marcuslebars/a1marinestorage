// Turning a resume token's state back into calculator state.
//
// Every PDF this site has ever produced prints a link to
// `/calculator?q=<signed token>`, and until now nothing read `?q=`. The link
// worked — it opened the calculator — it just opened it EMPTY, which is worse
// than no link at all: a customer who followed it lost the quote they were
// coming back to finish.
//
// This lives apart from Calculator.tsx because the mapping is the part that can
// be wrong, and it is only testable on its own. The token stores a `Selection`
// (the engine-facing shape); the calculator holds a `LogisticsValue` (the
// form-facing shape). They are not the same object, and the differences are
// exactly where a resume silently loses an answer:
//
//   • Selection.logistics.townSlug carries EITHER a locality slug OR the name
//     the customer typed; `bandResolution` says which. LogisticsValue splits
//     those into `townSlug` (a slug, or OTHER_TOWN) and `placeName`.
//   • Add-ons live under Selection.addOns but on the form they are part of
//     LogisticsValue.
//   • `alacarteIds` is an array in the token and a Set in the component.
import {
  bandForTown,
  EMPTY_LOGISTICS,
  OTHER_TOWN,
  type LogisticsValue,
  type ResolvedBand,
} from "@/components/LogisticsSection";
import type { BoatState, Selection } from "@/lib/quote-items";
import type { EngineType } from "@a1/pricing-engine";

export interface ResumePayload {
  ok: boolean;
  selection?: Selection;
  boat?: BoatState;
  ref?: string;
  issuedAt?: number;
  code?: "malformed" | "bad_signature" | "expired";
}

/** True when the payload is an expired link that still carried a usable boat. */
export function isExpiredWithBoat(p: ResumePayload): boolean {
  return p?.code === "expired" && Boolean(p.boat);
}

export interface ResumedState {
  lengthInput: string;
  hullType: string;
  engineType: EngineType;
  engineCount: number;
  mode: Selection["mode"];
  bundleId: string | null;
  alacarte: Set<string>;
  ceramicUpgrade: boolean;
  logisticsValue: LogisticsValue;
  /** Null when the band has to be re-derived from the server (a typed town). */
  resolvedBand: ResolvedBand | null;
  /**
   * True when the town was typed rather than picked, so the band must be
   * re-looked-up. The stored distance is NOT reused as a resolved band: it was
   * an estimate when it was made, and pretending otherwise would show a
   * transport price we never re-derived.
   */
  needsBandLookup: boolean;
  /** The place string to re-resolve when needsBandLookup is true. */
  bandLookupPlace?: string;
  ref?: string;
}

const ENGINE_TYPES: EngineType[] = ["outboard", "sterndrive", "inboard"];

function asEngineType(v: unknown): EngineType {
  return ENGINE_TYPES.includes(v as EngineType)
    ? (v as EngineType)
    : "outboard";
}

/**
 * Rebuild calculator state from a decoded token.
 *
 * Total by construction: every field falls back to the empty-form default, so a
 * token from an older payload shape resumes as much as it can rather than
 * throwing the customer out. A half-restored quote they can finish beats an
 * error page.
 */
export function hydrateFromResume(payload: ResumePayload): ResumedState | null {
  // An EXPIRED link still carries a signature-verified boat. Its prices are
  // stale, so the selection is not restored — but making someone retype their
  // boat because their link is a week old is a pointless punishment.
  //
  // The REFERENCE is deliberately dropped. A1MS-Q-XXXXXX names a specific
  // quote at specific prices; carrying it onto a re-priced one would put an old
  // number on a new amount, and the yard would have two different quotes
  // claiming to be the same one.
  if (payload?.code === "expired" && payload.boat) {
    return hydrateFromResume({
      ok: true,
      boat: payload.boat,
      selection: { mode: null },
    });
  }
  if (!payload?.ok || !payload.selection || !payload.boat) return null;

  const sel = payload.selection;
  const boat = payload.boat;
  const log = sel.logistics;

  const typedTown = log?.bandResolution === "place_estimate";
  const townSlug = log?.townSlug ?? "";

  const logisticsValue: LogisticsValue = {
    ...EMPTY_LOGISTICS,
    boatLocation: log?.boatLocation ?? null,
    // A typed town has no slug to select, so the picker goes to "Other" and the
    // free-text box carries the name back.
    townSlug: typedTown ? OTHER_TOWN : townSlug,
    placeName: typedTown ? townSlug : "",
    pickup: log?.pickup === true,
    delivery: log?.delivery === true,
    trailerProvided: log?.trailerProvided === true,
    batteryCount: sel.addOns?.batteryCount ?? 0,
    extendedMonths: sel.addOns?.extendedMonths ?? 0,
    oilChangeOutboard: sel.addOns?.oilChangeOutboard === true,
  };

  return {
    lengthInput: boat.lengthFt ? String(boat.lengthFt) : "",
    hullType: boat.hullType ?? "",
    engineType: asEngineType(boat.engineType),
    engineCount: boat.engineCount > 0 ? boat.engineCount : 1,
    mode: sel.mode ?? null,
    bundleId: sel.bundleId ?? null,
    alacarte: new Set(sel.alacarteIds ?? []),
    ceramicUpgrade: sel.ceramicUpgrade === true,
    logisticsValue,
    // A listed town re-derives locally and exactly. A typed one has to go back
    // to the server, because only the server can geocode.
    resolvedBand: typedTown || !townSlug ? null : bandForTown(townSlug),
    needsBandLookup: typedTown && Boolean(townSlug),
    bandLookupPlace: typedTown ? townSlug : undefined,
    ref: payload.ref,
  };
}

/**
 * Which step to land on.
 *
 * A resumed quote goes straight to the estimate — that is the whole point of
 * the link. An EXPIRED one lands on Step 2 with the boat prefilled instead,
 * because its prices are stale and showing them as current would be a lie.
 */
export function resumeLandingStep(payload: ResumePayload): 1 | 2 | 3 {
  // Step 2 only when there is actually a boat to have prefilled. Landing on
  // "choose your package" with no boat entered would be a dead end.
  if (payload.code === "expired") return isExpiredWithBoat(payload) ? 2 : 1;
  return payload.ok ? 3 : 1;
}

/** The banner a resumed customer sees. Null when there is nothing to say. */
export function resumeBanner(payload: ResumePayload): string | null {
  if (payload.code === "expired") {
    return "This quote link has expired; here are current prices.";
  }
  if (!payload.ok) return null;
  return payload.ref
    ? `Resuming quote ${payload.ref} — prices shown are today's.`
    : "Resuming your saved quote — prices shown are today's.";
}
