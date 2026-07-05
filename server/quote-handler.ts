// A1 Marine Storage — quote submission handler.
//
// Framework-agnostic: used by both the Express route (production) and the Vite
// dev middleware (development). Given a raw request body it:
//   1. validates the contact + recomputes the quote with the shared engine
//      (server-authoritative — never trusts client-claimed prices),
//   2. writes a durable server-side record of every submission (recoverable
//      independent of email/CRM),
//   3. forwards a Jobber-ready, source-tagged payload to the A1 lead pipeline
//      with retries,
//   4. emits a lightweight fire-and-forget analytics event.
//
// It only reports success once the durable record is written, so the customer
// never sees a fake success.

import { randomUUID } from "node:crypto";
import { calculateQuote, type QuoteInput, type QuoteResult } from "@a1/pricing-engine";
import { SOURCE_SITE, appendSubmission, logAnalytics, forwardToLeadPipeline } from "./lead-pipeline";

export interface QuoteContact {
  name: string;
  email: string;
  phone: string;
  boatMakeModelYear?: string;
  marina?: string;
}

export interface QuoteSubmission {
  quoteInput: QuoteInput;
  contact: QuoteContact;
  meta?: Record<string, unknown>;
}

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

/** Jobber-ready line item shape, preserved end-to-end. */
interface JobberLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContact(c: unknown): { ok: true; contact: QuoteContact } | { ok: false; error: string } {
  if (!c || typeof c !== "object") return { ok: false, error: "Missing contact details." };
  const contact = c as Record<string, unknown>;
  const name = typeof contact.name === "string" ? contact.name.trim() : "";
  const email = typeof contact.email === "string" ? contact.email.trim() : "";
  const phone = typeof contact.phone === "string" ? contact.phone.trim() : "";
  if (name.length < 2) return { ok: false, error: "A name is required." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "A valid email is required." };
  if (phone.replace(/\D/g, "").length < 7) return { ok: false, error: "A valid phone number is required." };
  return {
    ok: true,
    contact: {
      name,
      email,
      phone,
      boatMakeModelYear:
        typeof contact.boatMakeModelYear === "string" ? contact.boatMakeModelYear.trim() : undefined,
      marina: typeof contact.marina === "string" ? contact.marina.trim() : undefined,
    },
  };
}

function toJobberLineItems(quote: QuoteResult): JobberLineItem[] {
  return quote.lineItems.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
  }));
}

export async function handleQuoteSubmission(rawBody: unknown): Promise<HandlerResult> {
  const body = (rawBody ?? {}) as Partial<QuoteSubmission>;

  const contactCheck = validateContact(body.contact);
  if (!contactCheck.ok) {
    return { status: 400, body: { ok: false, error: contactCheck.error } };
  }

  if (!body.quoteInput || body.quoteInput.serviceLine !== "storage") {
    return { status: 400, body: { ok: false, error: "Missing or invalid quote details." } };
  }

  // Server-authoritative: recompute from the raw inputs. The engine rejects
  // absurd/unknown inputs, so this also validates the selection.
  let quote: QuoteResult;
  try {
    quote = calculateQuote(body.quoteInput);
  } catch (err) {
    return { status: 400, body: { ok: false, error: err instanceof Error ? err.message : "Could not price this quote." } };
  }

  const id = randomUUID();
  const receivedAt = new Date().toISOString();
  const contact = contactCheck.contact;
  const jobberLineItems = toJobberLineItems(quote);

  const record = {
    id,
    receivedAt,
    sourceSite: SOURCE_SITE,
    contact,
    quoteInput: body.quoteInput,
    quote,
    jobberLineItems,
    meta: body.meta ?? {},
  };

  // (1) Durable record FIRST — success is only reported after this succeeds.
  try {
    appendSubmission("quotes", receivedAt, record);
  } catch (err) {
    console.error("[quote] failed to persist durable record:", err instanceof Error ? err.message : String(err));
    return { status: 500, body: { ok: false, error: "We couldn't record your request. Please try again." } };
  }

  // (2) Lightweight fire-and-forget analytics event (submission, not calculation).
  {
    const win = quote.lineItems.find((l) => l.detail.type === "flat_per_engine");
    logAnalytics({
      event: "quote_submitted",
      at: receivedAt,
      sourceSite: SOURCE_SITE,
      quoteId: id,
      bundleId: quote.bundle?.id ?? null,
      hullType: quote.hullType,
      lengthFt: quote.lineItems.find((l) => l.detail.lengthFt != null)?.detail.lengthFt ?? null,
      engineType: win?.detail.engineType ?? null,
      engineCount: win?.detail.engineCount ?? null,
      itemCount: quote.lineItems.length,
      subtotalCents: quote.subtotalCents,
    });
  }

  // (3) Forward to the shared A1 lead pipeline, source-tagged, with retries.
  const summaryLines = quote.lineItems.map((l) => `${l.description} = ${(l.amountCents / 100).toFixed(2)}`);
  const forwardPayload: Record<string, unknown> = {
    source: "quote",
    sourceSite: SOURCE_SITE,
    site: SOURCE_SITE,
    leadLabel: "A1 MARINE STORAGE — Quote",
    quoteId: id,
    receivedAt,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    boatMakeModelYear: contact.boatMakeModelYear ?? "",
    marina: contact.marina ?? "",
    boatType: quote.hullType ?? "",
    jobberLineItems,
    currency: quote.currency,
    aLaCarteSubtotalCents: quote.aLaCarteSubtotalCents,
    bundleSavingsCents: quote.bundleSavingsCents,
    subtotalCents: quote.subtotalCents,
    notes: [
      `Source: A1 Marine Storage quote tool`,
      quote.bundle ? `Package: ${quote.bundle.label} (${quote.bundle.discountPct}% bundle)` : `À la carte`,
      contact.marina ? `Marina/location: ${contact.marina}` : "",
      contact.boatMakeModelYear ? `Boat: ${contact.boatMakeModelYear}` : "",
      "",
      ...summaryLines,
      `À-la-carte: $${(quote.aLaCarteSubtotalCents / 100).toFixed(2)}`,
      quote.bundleSavingsCents > 0 ? `Bundle savings: $${(quote.bundleSavingsCents / 100).toFixed(2)}` : "",
      `Subtotal (pre-HST): $${(quote.subtotalCents / 100).toFixed(2)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
  // Fire-and-forget with internal retry; the durable log already holds the record.
  void forwardToLeadPipeline("quote", forwardPayload);

  return {
    status: 200,
    body: {
      ok: true,
      quoteId: id,
      subtotalCents: quote.subtotalCents,
    },
  };
}
