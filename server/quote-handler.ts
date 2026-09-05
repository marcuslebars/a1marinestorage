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
import {
  calculateQuote,
  type QuoteInput,
  type QuoteResult,
} from "@a1/pricing-engine";
import {
  SOURCE_SITE,
  logAnalytics,
  forwardToLeadPipeline,
} from "./lead-pipeline";
import { persistLead } from "./persist";
import { normalizeContact } from "./normalize";
import { evaluateEligibility } from "./eligibility";
import { notify } from "./notify/notify";
import { renderOwnerAlertEmail } from "./notify/templates/owner-alert";
import {
  renderQuoteConfirmationEmail,
  renderQuoteConfirmationSms,
} from "./notify/templates/quote-confirmation";
import { encodeResumeToken, resumeUrlFor } from "./resume-token";
import {
  describeExtras,
  type BoatState,
  type Selection,
} from "../client/src/lib/quote-items";
import { isHoneypotTripped } from "./security/honeypot";
import { attachEmpireVuResult } from "./db/quotes";
import {
  buildStorageQuoteEnvelope,
  compactLogistics,
  forwardToEmpireVu,
  type LeadLogistics,
  type LeadSelection,
} from "./empirevu";

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

function validateContact(
  c: unknown
): { ok: true; contact: QuoteContact } | { ok: false; error: string } {
  if (!c || typeof c !== "object")
    return { ok: false, error: "Missing contact details." };
  const contact = c as Record<string, unknown>;
  // NORMALISE FIRST, then validate what we are actually going to store. The old
  // order validated the raw string and stored it, so "(705) 555-1234" passed
  // and was then unsendable by SMS — the number was fine, our copy of it was not.
  const { name, email, phone, phoneValid } = normalizeContact(contact);
  if (name.length < 2) return { ok: false, error: "A name is required." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "A valid email is required." };
  // A number we could not parse is still worth capturing — a person can dial it
  // — so the bar stays "enough digits to be a phone number" rather than
  // "libphonenumber approves". phoneValid records which it was.
  if (!phoneValid && phone.replace(/\D/g, "").length < 7)
    return { ok: false, error: "A valid phone number is required." };
  return {
    ok: true,
    contact: {
      name,
      email,
      phone,
      boatMakeModelYear:
        typeof contact.boatMakeModelYear === "string"
          ? contact.boatMakeModelYear.trim()
          : undefined,
      marina:
        typeof contact.marina === "string" ? contact.marina.trim() : undefined,
    },
  };
}

function toJobberLineItems(quote: QuoteResult): JobberLineItem[] {
  return quote.lineItems.map(l => ({
    description: l.description,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
  }));
}

/**
 * How long a customer waits for EmpireVu before we give up and show the
 * quote-request copy instead.
 *
 * Short on purpose. This is time added to a request the customer is watching,
 * spent on something that only IMPROVES the confirmation screen — the lead is
 * safe either way. Four seconds covers a healthy round trip including the quote
 * write; beyond that, waiting costs the customer more than the button is worth.
 */
const EMPIREVU_WAIT_MS = 4000;

/**
 * Await a promise, or give up. Never rejects, and never cancels the underlying
 * work — the forward keeps retrying in the background on its own.
 */
async function withDeadline<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    // A rejection here is already impossible (forwardToEmpireVu never throws),
    // but catching keeps that from becoming a silent unhandled rejection if it
    // ever changes.
    return await Promise.race([p.catch(() => null), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v ? v : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const bool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

// Add-ons are counted, not chosen: 0 batteries and no batteries are the same
// thing, so they drop out. Transport booleans use `bool` instead, because
// `pickup: false` is a real answer — "I'll tow it in, you deliver it back" is a
// different job from "no transport", and compact() preserves it on purpose.
const count = (v: unknown): number | undefined => {
  const n = num(v);
  return n && n > 0 ? n : undefined;
};
const chosen = (v: unknown): true | undefined =>
  v === true ? true : undefined;

/**
 * Flatten the calculator's `logistics` + `addOns` into the envelope's block.
 *
 * Every field is read defensively and dropped when absent, so a submission from
 * a cached older bundle — which sends neither — produces exactly the envelope it
 * produced before, and a hand-crafted body cannot inject arbitrary keys.
 *
 * Nothing here affects PRICE. The quote was already computed from `quoteInput`
 * above; this is capture context travelling alongside it.
 */
function logisticsFromMeta(
  meta: Record<string, unknown>
): LeadLogistics | undefined {
  const log = (meta.logistics ?? undefined) as
    | Record<string, unknown>
    | undefined;
  const add = (meta.addOns ?? undefined) as Record<string, unknown> | undefined;
  if (!log && !add) return undefined;

  const location = str(log?.boatLocation);
  const out: LeadLogistics = {
    boatLocation: location,
    // The client calls it townSlug; the envelope calls it town. It holds either a
    // locality slug or a typed town name — bandResolution says which.
    town: str(log?.townSlug),
    transportBand: str(log?.transportBand),
    distanceKm: num(log?.distanceKm),
    bandResolution: str(log?.bandResolution),
    pickup: bool(log?.pickup),
    delivery: bool(log?.delivery),
    trailerProvided: bool(log?.trailerProvided),
    // Derived, not sent: an in-water boat needs a haul-out, which has no priced
    // line. Flagging it here is what tells EmpireVu not to auto-quote the lead.
    inWaterNotice: location === "lift_or_water" ? true : undefined,
    batteryCount: count(add?.batteryCount),
    extendedMonths: count(add?.extendedMonths),
    oilChangeOutboard: chosen(add?.oilChangeOutboard),
    springWrapRemoval: chosen(add?.springWrapRemoval),
  };
  return compactLogistics(out);
}

/**
 * The selection, by service key, from the input the engine just priced.
 *
 * Taken from `quoteInput` rather than a separate client field so it cannot
 * disagree with what was quoted: `calculateQuote` has already rejected unknown
 * services by the time this runs.
 */
function selectionFromInput(
  input: QuoteInput | undefined
): LeadSelection | undefined {
  const items = input?.items ?? [];
  if (items.length === 0) return undefined;
  return {
    bundleKey: input?.bundleId,
    variant: input?.hullType,
    services: items.map(i => ({
      serviceKey: i.serviceId,
      measure: i.lengthFt,
      // A flat_per_engine service carries its count as engineCount; per_unit
      // services carry quantity. EmpireVu's catalog wants one field.
      quantity: i.quantity ?? i.engineCount,
    })),
  };
}

export async function handleQuoteSubmission(
  rawBody: unknown
): Promise<HandlerResult> {
  const body = (rawBody ?? {}) as Partial<QuoteSubmission>;

  // The honeypot lives HERE, not in the route.
  //
  // It was in server/index.ts, which the Vite dev middleware does not use — so
  // dev accepted every bot submission while production rejected them, and any
  // new caller of this handler would have silently had no protection at all. A
  // check that a caller can forget is a check that will be forgotten.
  if (isHoneypotTripped(rawBody)) {
    console.log("[quote] honeypot tripped — discarded");
    return { status: 200, body: { ok: true } };
  }

  const contactCheck = validateContact(body.contact);
  if (!contactCheck.ok) {
    return { status: 400, body: { ok: false, error: contactCheck.error } };
  }

  if (!body.quoteInput || body.quoteInput.serviceLine !== "storage") {
    return {
      status: 400,
      body: { ok: false, error: "Missing or invalid quote details." },
    };
  }

  // Server-authoritative: recompute from the raw inputs. The engine rejects
  // absurd/unknown inputs, so this also validates the selection.
  let quote: QuoteResult;
  try {
    quote = calculateQuote(body.quoteInput);
  } catch (err) {
    return {
      status: 400,
      body: {
        ok: false,
        error:
          err instanceof Error ? err.message : "Could not price this quote.",
      },
    };
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
  //
  // Postgres, then the JSONL mirror, and a 500 only when BOTH refused. The
  // JSONL file lives on Railway's ephemeral filesystem and does not survive a
  // redeploy, so it can no longer be the record on its own; equally, a
  // momentarily unreachable database must not turn away a customer whose lead
  // the mirror is holding safely.
  const stored = await persistLead(
    {
      id,
      receivedAt,
      source: "calculator",
      reference:
        typeof (body.meta as Record<string, unknown> | undefined)?.quoteRef ===
        "string"
          ? ((body.meta as Record<string, unknown>).quoteRef as string)
          : undefined,
      contact: { ...contact },
      quoteInput: body.quoteInput,
      quote,
      selection: (body.meta as Record<string, unknown> | undefined)?.selection,
      meta: (body.meta ?? {}) as Record<string, unknown>,
    },
    "quotes",
    record
  );
  if (!stored.ok) {
    return {
      status: 500,
      body: {
        ok: false,
        error: "We couldn't record your request. Please try again.",
      },
    };
  }

  // (2) Lightweight fire-and-forget analytics event (submission, not calculation).
  {
    const win = quote.lineItems.find(l => l.detail.type === "flat_per_engine");
    logAnalytics({
      event: "quote_submitted",
      at: receivedAt,
      sourceSite: SOURCE_SITE,
      quoteId: id,
      bundleId: quote.bundle?.id ?? null,
      hullType: quote.hullType,
      lengthFt:
        quote.lineItems.find(l => l.detail.lengthFt != null)?.detail.lengthFt ??
        null,
      engineType: win?.detail.engineType ?? null,
      engineCount: win?.detail.engineCount ?? null,
      itemCount: quote.lineItems.length,
      subtotalCents: quote.subtotalCents,
    });
  }

  // (3) Forward to the shared A1 lead pipeline, source-tagged, with retries.
  const summaryLines = quote.lineItems.map(
    l => `${l.description} = ${(l.amountCents / 100).toFixed(2)}`
  );
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
      quote.bundle
        ? `Package: ${quote.bundle.label} (${quote.bundle.discountPct}% bundle)`
        : `À la carte`,
      contact.marina ? `Marina/location: ${contact.marina}` : "",
      contact.boatMakeModelYear ? `Boat: ${contact.boatMakeModelYear}` : "",
      "",
      ...summaryLines,
      `À-la-carte: $${(quote.aLaCarteSubtotalCents / 100).toFixed(2)}`,
      quote.bundleSavingsCents > 0
        ? `Bundle savings: $${(quote.bundleSavingsCents / 100).toFixed(2)}`
        : "",
      `Subtotal (pre-HST): $${(quote.subtotalCents / 100).toFixed(2)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
  // Fire-and-forget with internal retry; the durable log already holds the record.
  void forwardToLeadPipeline("quote", forwardPayload);

  // Additive dual-send: the SAME quote to EmpireVu's canonical intake, best-effort.
  const meta = (body.meta ?? {}) as Record<string, unknown>;
  const utm =
    typeof meta.utm === "object"
      ? (meta.utm as Record<string, string>)
      : undefined;
  //
  // AWAITED, BUT BOUNDED. EmpireVu answers with a payable quote link when it
  // auto-quotes the lead, and that link is what turns the confirmation screen
  // from "we've sent you a link" into a button the customer can press. Getting
  // it means waiting for the round trip.
  //
  // The wait is capped hard. The durable record is already written above and the
  // legacy pipeline has already been fired, so this call is the ONLY thing that
  // could make a customer stare at a spinner — and a slow or dead EmpireVu must
  // never do that. On timeout the forward keeps running in the background with
  // its own retries; we simply stop waiting and fall back to the existing copy.
  const empireVu = await withDeadline(
    forwardToEmpireVu(
      buildStorageQuoteEnvelope({
        id,
        receivedAt,
        contact,
        quote,
        jobberLineItems,
        utm,
        logistics: logisticsFromMeta(meta),
        // Derived from the quoteInput the ENGINE just priced, not from a separate
        // client field: those items are the selection, and they have already been
        // validated by calculateQuote above.
        selection: selectionFromInput(body.quoteInput),
        // A resumed quote carries the reference from the PDF the customer is
        // holding, so the booked lead keeps the number they can see.
        quoteRef: typeof meta.quoteRef === "string" ? meta.quoteRef : undefined,
      })
    ),
    EMPIREVU_WAIT_MS
  );

  // Record what came back, so the row knows whether this quote has a payable
  // link. Best-effort and unawaited: the customer is already being answered,
  // and Phase 2 reads this column to decide whether to send its own
  // confirmation email or let EmpireVu's quote email be the confirmation.
  if (empireVu?.quoteUrl || empireVu?.leadId) {
    void attachEmpireVuResult(id, {
      depositUrl: empireVu.quoteUrl,
      leadId: empireVu.leadId,
    });
  }

  // (4) Tell somebody. UNAWAITED — the customer has been answered and nothing
  //     below may add a millisecond to their wait or a way for their submission
  //     to fail. notify() never throws and claims its idempotency key before
  //     sending, so a retried handler cannot double-send.
  void sendQuoteNotifications({
    id,
    contact,
    quote,
    quoteInput: body.quoteInput,
    meta,
    depositUrl: empireVu?.quoteUrl,
    reference: typeof meta.quoteRef === "string" ? meta.quoteRef : undefined,
  });

  return {
    status: 200,
    body: {
      ok: true,
      quoteId: id,
      subtotalCents: quote.subtotalCents,
      // Present only when EmpireVu auto-quoted this lead. The client shows a
      // deposit button when it is here and its existing copy when it is not.
      depositUrl: empireVu?.quoteUrl,
    },
  };
}

/**
 * Everything we say about a submitted quote: customer email, customer SMS,
 * owner alert.
 *
 * NEVER THROWS, never awaited by the handler. A notification problem must not
 * become a failed submission — the quote is already recorded, which is the part
 * that actually matters.
 *
 * THE EMAIL IS CONDITIONAL. When EmpireVu returned a payable link it also sent
 * its own quote email, and that one IS the confirmation. Sending ours as well
 * would put two emails about one quote in the customer's inbox, arriving
 * seconds apart, disagreeing about what to do next. The SMS still goes either
 * way (EmpireVu sends none), and the owner alert always goes — a lead the yard
 * never hears about is the failure this whole phase exists to prevent.
 */
async function sendQuoteNotifications(input: {
  id: string;
  contact: QuoteContact;
  quote: QuoteResult;
  quoteInput: QuoteInput;
  meta: Record<string, unknown>;
  depositUrl?: string;
  reference?: string;
}): Promise<void> {
  try {
    const { id, contact, quote, meta, depositUrl } = input;
    const selection = (meta.selection ?? undefined) as Selection | undefined;
    const boatMeta = (meta.boat ?? undefined) as BoatState | undefined;
    const log = (meta.logistics ?? undefined) as
      | Record<string, unknown>
      | undefined;
    const addOns = (meta.addOns ?? undefined) as
      | Record<string, unknown>
      | undefined;

    // Which appended line is which. describeExtras is the same function the
    // calculator uses, so the email cannot label a row differently from the
    // screen the customer just read.
    const extras =
      selection && boatMeta ? describeExtras(selection, boatMeta) : [];

    const lengthFt =
      quote.lineItems.find(l => l.detail.lengthFt != null)?.detail.lengthFt ??
      null;

    const eligibility = evaluateEligibility({
      hullType: quote.hullType,
      lengthFt,
      boatLocation:
        typeof log?.boatLocation === "string" ? log.boatLocation : null,
      transportBand:
        typeof log?.transportBand === "string" ? log.transportBand : null,
      extendedMonths:
        typeof addOns?.extendedMonths === "number"
          ? addOns.extendedMonths
          : null,
    });

    // ── Owner alert. Always, whatever happened upstream.
    {
      const to = process.env.OWNER_ALERT_EMAIL || process.env.MAIL_BCC_OWNER;
      if (to) {
        const mail = renderOwnerAlertEmail({
          reference: input.reference,
          contact,
          quote,
          extras,
          eligibility,
          boat: boatMeta,
          logistics: log,
          depositUrl,
          source: typeof meta.source === "string" ? meta.source : "calculator",
        });
        void notify(id, "owner_alert", "email", {
          to,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          // Replies go to the CUSTOMER, so the yard can just hit reply.
          replyTo: contact.email,
        });
      } else {
        console.log(
          "[notify] no OWNER_ALERT_EMAIL/MAIL_BCC_OWNER — owner alert skipped"
        );
      }
    }

    // ── Customer email, only when EmpireVu did not already send one.
    if (!depositUrl) {
      const mail = renderQuoteConfirmationEmail({
        name: contact.name,
        reference: input.reference,
        quote,
        extras,
        resumeUrl: resumeUrlForQuote(selection, boatMeta, input.reference),
      });
      void notify(id, "quote_confirmation", "email", {
        to: contact.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    } else {
      console.log(
        `[notify] quote_confirmation email skipped for ${id} — EmpireVu sent its own quote email`
      );
    }

    // ── Customer SMS, either way.
    void notify(id, "quote_confirmation", "sms", {
      to: contact.phone,
      text: renderQuoteConfirmationSms({
        reference: input.reference,
        lengthFt,
        hullType: quote.hullType,
        depositUrl,
      }),
    });
  } catch (err) {
    console.error(
      "[notify] quote notifications failed (submission unaffected):",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/** The "change something" link, when we have enough to rebuild the quote. */
function resumeUrlForQuote(
  selection: Selection | undefined,
  boat: BoatState | undefined,
  ref?: string
): string | undefined {
  if (!selection || !boat) return undefined;
  const origin = process.env.PUBLIC_BASE_URL || "https://a1marinestorage.ca";
  return resumeUrlFor(encodeResumeToken({ selection, boat, ref }), origin);
}
