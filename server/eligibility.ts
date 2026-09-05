// Can this lead be auto-quoted, and if not, why not?
//
// PURE. No IO, no env, no engine call — it reads what the engine already priced
// plus the captured logistics and answers a yes/no with short machine reasons.
//
// Phase 2 uses it for ONE thing: the owner alert, so the yard can tell at a
// glance whether a lead needs a phone call. Phase 3 (3.5) is where it goes onto
// the EmpireVu envelope as `meta.eligibility` and the golden fixtures are
// deliberately updated — that is a contract change and does not belong in a
// notifications phase.
//
// The reasons are machine strings, not prose, so the email can render them and
// EmpireVu can branch on them later without parsing English.

/** Longest boat the yard will auto-quote without a look. */
export const AUTO_QUOTE_MAX_FT = 40;

export type EligibilityReason =
  | "hull_other"
  | "in_water"
  | "transport_beyond"
  | "over_40ft"
  | "extended_storage";

export interface Eligibility {
  autoQuoteEligible: boolean;
  reasons: EligibilityReason[];
}

/** What each reason means to a human. Used by the owner alert. */
export const REASON_TEXT: Record<EligibilityReason, string> = {
  hull_other: "Hull type is “other” — needs a look before quoting",
  in_water: "Boat is in the water or on a lift — needs a haul-out plan",
  transport_beyond: "Beyond the furthest transport band — custom rate",
  over_40ft: `Over ${AUTO_QUOTE_MAX_FT} ft — outside the auto-quote range`,
  extended_storage: "Extended storage months — hand-quoted for now",
};

export interface EligibilityInput {
  hullType?: string | null;
  lengthFt?: number | null;
  boatLocation?: string | null;
  transportBand?: string | null;
  extendedMonths?: number | null;
}

/**
 * Decide, and say why not.
 *
 * Every check is a reason a HUMAN has to be involved, not a reason to refuse
 * the lead. An ineligible quote is still recorded, still forwarded, still
 * emailed — it just gets flagged so nobody has to notice it by reading a table.
 *
 * `transportBand: null` is eligible on purpose: no transport is not the same as
 * transport we cannot price. Only `beyond` — past the furthest band, where no
 * flat rate exists — needs a person.
 */
export function evaluateEligibility(input: EligibilityInput): Eligibility {
  const reasons: EligibilityReason[] = [];

  if (input.hullType === "other") reasons.push("hull_other");
  if (input.boatLocation === "lift_or_water") reasons.push("in_water");
  if (input.transportBand === "beyond") reasons.push("transport_beyond");
  if (
    typeof input.lengthFt === "number" &&
    input.lengthFt > AUTO_QUOTE_MAX_FT
  ) {
    reasons.push("over_40ft");
  }
  if (typeof input.extendedMonths === "number" && input.extendedMonths > 0) {
    reasons.push("extended_storage");
  }

  return { autoQuoteEligible: reasons.length === 0, reasons };
}
