// The presentable quote — one shape, rendered by both the Your Quote panel and
// the PDF.
//
// WHY A SHARED MODEL: the PDF is server-rendered from a server-side engine
// recompute, while the panel renders from the client's. If each built its own
// view of a quote they would eventually disagree, and the customer would be
// holding a PDF that contradicts the screen. One model, built once per surface
// from the same engine result, is what makes "the PDF and the panel never
// disagree" testable rather than hoped for.
//
// PURE and dependency-light on purpose: EmpireVu's hosted quote page (Phase 3)
// should be able to reuse this and the renderer built on it. Nothing here
// imports React, Express, or anything site-specific.
import type { QuoteResult } from "@a1/pricing-engine";

import type {
  BoatLocation,
  ExtraLineRef,
  TransportBand,
} from "../client/src/lib/quote-items";

/** A line as the customer reads it. Money is integer cents. */
export interface QuoteModelLine {
  label: string;
  description: string;
  amountCents: number;
  /** True for lines outside the bundle discount (transport, trailer, add-ons). */
  outsideBundle: boolean;
}

export interface QuoteModelLogistics {
  boatLocation: BoatLocation;
  locationLabel: string;
  band?: TransportBand | null;
  bandLabel?: string | null;
  /** Rendered range, e.g. "0–25 km". Sourced from the engine's band table. */
  bandRange?: string | null;
  distanceKm?: number | null;
  /** True when the distance is a geocoded estimate rather than a listed town. */
  estimated?: boolean;
  townLabel?: string | null;
  pickup: boolean;
  delivery: boolean;
  trailerProvided: boolean;
  /** In-water pickup: shown as a notice, never as a priced line. */
  inWaterNotice: boolean;
  /** Beyond the furthest band: no total, quoted by hand. */
  customTransportQuote: boolean;
}

export interface QuoteModel {
  /** Short human reference, e.g. A1MS-Q-7K2F9Q. */
  reference: string;
  /** ISO date the quote was produced. */
  issuedAt: string;
  boat: {
    lengthFt: number;
    hullType?: string | null;
    engineType: string;
    engineCount: number;
  };
  packageLabel: string | null;
  /** Lines inside the bundle, then everything outside it. */
  lines: QuoteModelLine[];
  bundleSavingsCents: number;
  subtotalCents: number;
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
  depositRateBps: number;
  depositCents: number;
  logistics?: QuoteModelLogistics | null;
  /** Where the customer can pick the quote back up. */
  resumeUrl?: string | null;
}

/** HST, quote-time. The engine leaves tax to the caller (see its QuoteResult). */
export const HST_RATE_BPS = 1300;
/** Deposit that reserves the spot. */
export const DEPOSIT_RATE_BPS = 2500;

/**
 * Exact integer round-half-up — no floating-point drift on the .5 boundary.
 * Same routine EmpireVu uses, deliberately, so a quote priced on either side
 * lands on the same cent.
 */
export function roundHalfUpDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

export interface QuoteTotals {
  subtotalCents: number;
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
  depositRateBps: number;
  depositCents: number;
}

/**
 * Tax and deposit from an engine subtotal.
 *
 * The deposit is a share of the TAX-INCLUSIVE total, which is why it is computed
 * here and not by the engine — the engine's QuoteResult stops at the pre-tax
 * subtotal by design.
 */
export function totalsFromSubtotal(
  subtotalCents: number,
  taxRateBps = HST_RATE_BPS,
  depositRateBps = DEPOSIT_RATE_BPS
): QuoteTotals {
  const taxCents = roundHalfUpDiv(subtotalCents * taxRateBps, 10_000);
  const totalCents = subtotalCents + taxCents;
  return {
    subtotalCents,
    taxRateBps,
    taxCents,
    totalCents,
    depositRateBps,
    depositCents: Math.min(
      totalCents,
      roundHalfUpDiv(totalCents * depositRateBps, 10_000)
    ),
  };
}

/** Human-readable, unambiguous reference. No I/O/0/1 — they get misread aloud. */
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateQuoteReference(randomBytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < 6; i++)
    out += REF_ALPHABET[randomBytes[i] % REF_ALPHABET.length];
  return `A1MS-Q-${out}`;
}

const ENGINE_LABEL: Record<string, string> = {
  outboard: "Outboard",
  sterndrive: "Sterndrive",
  inboard: "Inboard",
};

export const BOAT_LOCATION_LABEL: Record<BoatLocation, string> = {
  self_transport: "Bringing it to the yard themselves",
  home_trailer: "On a trailer at home / cottage",
  marina_ramp: "At a marina or launch ramp (drive-on)",
  lift_or_water: "On a lift or in the water",
};

export function engineLabel(engineType: string, engineCount: number): string {
  const base = ENGINE_LABEL[engineType] ?? engineType;
  return engineCount > 1 ? `${base} × ${engineCount}` : base;
}

/**
 * Build the presentable model from an engine result.
 *
 * `extras` says which engine lines sit outside the bundle — it is the only way
 * to know, since the engine's own bundleEligible flag is false for a line the
 * bundle simply didn't name as well as for one deliberately excluded.
 */
export function buildQuoteModel(input: {
  reference: string;
  issuedAt: string;
  quote: QuoteResult;
  extras: ExtraLineRef[];
  boat: QuoteModel["boat"];
  packageLabel?: string | null;
  logistics?: QuoteModelLogistics | null;
  resumeUrl?: string | null;
  taxRateBps?: number;
  depositRateBps?: number;
}): QuoteModel {
  const extraIndices = new Set(input.extras.map(e => e.index));

  const lines: QuoteModelLine[] = input.quote.lineItems.map((l, i) => ({
    label: l.label,
    description: l.description,
    amountCents: l.amountCents,
    outsideBundle: extraIndices.has(i),
  }));

  const totals = totalsFromSubtotal(
    input.quote.subtotalCents,
    input.taxRateBps ?? HST_RATE_BPS,
    input.depositRateBps ?? DEPOSIT_RATE_BPS
  );

  return {
    reference: input.reference,
    issuedAt: input.issuedAt,
    boat: input.boat,
    packageLabel: input.packageLabel ?? input.quote.bundle?.label ?? null,
    lines,
    bundleSavingsCents: input.quote.bundleSavingsCents,
    ...totals,
    logistics: input.logistics ?? null,
    resumeUrl: input.resumeUrl ?? null,
  };
}

/** CAD, for display. */
export function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-CA");
  return `${sign}$${dollars}.${(abs % 100).toString().padStart(2, "0")}`;
}
