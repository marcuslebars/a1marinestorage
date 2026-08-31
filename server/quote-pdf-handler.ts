// POST /api/quote/pdf — the downloadable quote.
//
// The client sends its SELECTION; the server re-prices it through the engine and
// renders from that. Client totals are never trusted and never even read — the
// request has nowhere to put a price. That is what guarantees the PDF and the
// on-screen panel agree: both are the engine's answer to the same selection.
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { calculateQuote, transportBandInfo, type TransportBand } from "@a1/pricing-engine";

import {
  buildStorageQuoteInput,
  describeExtras,
  needsHaulOutNotice,
  type BoatState,
  type Selection,
} from "../client/src/lib/quote-items";
import { BOAT_LOCATION_LABEL, buildQuoteModel, generateQuoteReference } from "../shared/quote-model";
import { localityBySlug } from "../shared/localities";
import { renderQuotePdf, type PdfBrand } from "./quote-pdf";
import { encodeResumeToken, resumeUrlFor } from "./resume-token";

export interface QuotePdfRequest {
  selection: Selection;
  boat: BoatState;
  /** Optional — the soft gate. Never required; the download is never blocked. */
  email?: string;
  /** Absolute origin for the resume link, e.g. https://a1marinestorage.ca */
  origin?: string;
}

export interface QuotePdfResult {
  pdf: Buffer;
  reference: string;
  filename: string;
  /** Present when the customer volunteered an email — the caller files the lead. */
  email?: string;
  resumeUrl: string;
}

export class QuotePdfError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_selection" | "render_failed",
  ) {
    super(message);
    this.name = "QuotePdfError";
  }
}

/**
 * Hard-gate switch, per the brief: soft by default, one line to flip.
 *
 * Soft means the email field is asked for but never enforced — a customer who
 * declines still gets their quote. Making it required trades a download for an
 * address, which is a worse deal for someone still deciding.
 */
export const PDF_EMAIL_GATE: "soft" | "hard" =
  (process.env.PDF_EMAIL_GATE as "soft" | "hard") ?? "soft";

let cachedLogo: { data: Buffer; format: "png" } | undefined;

/**
 * Load the logo once. A missing asset is NOT fatal: the renderer falls back to a
 * wordmark, and a customer waiting on a quote should not be denied it because a
 * file moved.
 */
function logo(): { data: Buffer; format: "png" } | undefined {
  if (cachedLogo) return cachedLogo;
  for (const rel of ["client/public/a1-marine-storage-logo.png", "dist/public/a1-marine-storage-logo.png"]) {
    const p = path.resolve(process.cwd(), rel);
    if (fs.existsSync(p)) {
      cachedLogo = { data: fs.readFileSync(p), format: "png" };
      return cachedLogo;
    }
  }
  console.warn("[quote-pdf] logo asset not found; falling back to a wordmark");
  return undefined;
}

export function brandForPdf(): PdfBrand {
  return {
    businessName: "A1 Marine Storage",
    addressLines: ["639 Concession Road 16 East, Tiny, ON L9M 1R2"],
    phone: "(249) 444-0072",
    website: "a1marinestorage.ca",
    logo: logo(),
    primaryColor: "#C82222",
    darkColor: "#940303",
  };
}

/** Band range as the customer reads it, sourced from the engine's band table. */
function bandRangeLabel(band: TransportBand): string | null {
  const info = transportBandInfo(band);
  if (info.maxKm == null) return `${info.minKm}+ km`;
  return `${info.minKm}–${info.maxKm} km`;
}

function logisticsForModel(sel: Selection) {
  const log = sel.logistics;
  if (!log) return null;

  const band = log.transportBand ?? null;
  const town = log.townSlug ? localityBySlug(log.townSlug) : null;

  return {
    boatLocation: log.boatLocation,
    locationLabel: BOAT_LOCATION_LABEL[log.boatLocation],
    band,
    bandLabel: band ? transportBandInfo(band).label : null,
    bandRange: band ? bandRangeLabel(band) : null,
    distanceKm: log.distanceKm ?? town?.distanceKm ?? null,
    estimated: log.bandResolution === "place_estimate",
    // A slug resolves to a proper name; a typed town has no slug to resolve, so
    // it prints as the customer wrote it rather than vanishing from the PDF.
    townLabel: town?.name ?? (log.bandResolution === "place_estimate" ? log.townSlug ?? null : null),
    pickup: log.pickup === true,
    delivery: log.delivery === true,
    trailerProvided: log.trailerProvided === true,
    inWaterNotice: needsHaulOutNotice(log.boatLocation),
    // Beyond the furthest band there is no flat rate, so no total is printed —
    // the PDF says a custom rate will be confirmed instead of inventing one.
    customTransportQuote: band === "beyond",
  };
}

export async function handleQuotePdf(req: QuotePdfRequest): Promise<QuotePdfResult> {
  const input = buildStorageQuoteInput(req.selection, req.boat);
  if (!input) {
    throw new QuotePdfError("Choose a package or at least one service first.", "invalid_selection");
  }

  // The engine, server-side. The request carries no prices and none are read.
  const quote = calculateQuote(input);
  const reference = generateQuoteReference(randomBytes(6));

  const origin = req.origin ?? "https://a1marinestorage.ca";
  const token = encodeResumeToken({ selection: req.selection, boat: req.boat, ref: reference });
  const resumeUrl = resumeUrlFor(token, origin);

  const model = buildQuoteModel({
    reference,
    issuedAt: new Date().toISOString(),
    quote,
    extras: describeExtras(req.selection, req.boat),
    boat: {
      lengthFt: req.boat.lengthFt,
      hullType: req.boat.hullType || null,
      engineType: req.boat.engineType,
      engineCount: req.boat.engineCount,
    },
    logistics: logisticsForModel(req.selection),
    resumeUrl,
  });

  let pdf: Buffer;
  try {
    pdf = await renderQuotePdf(model, brandForPdf());
  } catch (err) {
    throw new QuotePdfError(
      `Could not render the quote PDF: ${err instanceof Error ? err.message : String(err)}`,
      "render_failed",
    );
  }

  return {
    pdf,
    reference,
    filename: `A1-Marine-Storage-Quote-${reference}.pdf`,
    email: req.email?.trim() || undefined,
    resumeUrl,
  };
}
