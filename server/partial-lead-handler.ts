// A partial lead — someone downloaded their quote and left an email.
//
// WHY THIS EXISTS SEPARATELY. `/api/quote/pdf` used to file that email through
// handleQuoteSubmission with `name: ""` and `phone: ""`. validateContact
// returns `{ ok: false, error: "A name is required." }` — a return value, not a
// throw — so the endpoint's `.catch()` never fired. No record, no log line, no
// lead. The person who downloads a quote is the warmest lead the site has, and
// they were the one being dropped.
//
// The fix is not to loosen validateContact. A booked quote genuinely needs a
// name and a phone; a downloaded one genuinely does not have them yet. Those
// are two different records with two different bars, and collapsing them would
// either let nameless leads into the booking path or keep dropping these.
//
// Server-authoritative, same as everywhere else: the request carries a
// SELECTION and the engine prices it here. There is nowhere in this input to
// put money.
import { randomUUID } from "node:crypto";

import { calculateQuote, type QuoteResult } from "@a1/pricing-engine";

import {
  buildStorageQuoteInput,
  type BoatState,
  type Selection,
} from "../client/src/lib/quote-items";
import {
  buildStorageQuoteEnvelope,
  forwardToEmpireVu,
  type LeadLineItem,
} from "./empirevu";
import { SOURCE_SITE, forwardToLeadPipeline } from "./lead-pipeline";
import { notify } from "./notify/notify";
import { renderPdfCopyEmail } from "./notify/templates/pdf-copy";
import { persistLead } from "./persist";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PartialQuoteLead {
  email: string;
  selection: Selection;
  boat: BoatState;
  /** The A1MS-Q-XXXXXX printed on the PDF the customer just took away. */
  quoteRef?: string;
  /** The rendered PDF, attached to the copy email when mail is configured. */
  pdf?: Buffer;
  /** The link printed on the PDF, repeated in the email as a button. */
  resumeUrl?: string;
  meta?: Record<string, unknown>;
}

export interface PartialLeadResult {
  ok: boolean;
  id?: string;
  reason?: string;
}

function toLineItems(quote: QuoteResult): LeadLineItem[] {
  return quote.lineItems.map(l => ({
    description: l.description,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
  }));
}

/**
 * File a download as a lead.
 *
 * NEVER THROWS and never blocks its caller's real work — the customer came for
 * a PDF, and lead capture must not be able to take it away from them. The
 * result says what happened so the endpoint can log it, which is the part that
 * was missing before: a dropped lead used to leave no trace at all.
 */
export async function handlePartialQuoteLead(
  input: PartialQuoteLead
): Promise<PartialLeadResult> {
  try {
    const email = String(input.email ?? "").trim();
    if (!EMAIL_RE.test(email)) {
      // Not an error worth alarming about: the field is optional, and someone
      // typing half an address is the expected case.
      console.log("[partial-lead] no usable email — nothing to file");
      return { ok: false, reason: "invalid_email" };
    }

    const quoteInput = buildStorageQuoteInput(input.selection, input.boat);
    if (!quoteInput) {
      console.log(
        "[partial-lead] selection is not priceable — nothing to file"
      );
      return { ok: false, reason: "invalid_selection" };
    }

    let quote: QuoteResult;
    try {
      quote = calculateQuote(quoteInput);
    } catch (err) {
      console.error(
        "[partial-lead] engine refused the selection:",
        err instanceof Error ? err.message : String(err)
      );
      return { ok: false, reason: "invalid_selection" };
    }

    const id = randomUUID();
    const receivedAt = new Date().toISOString();
    const lineItems = toLineItems(quote);
    // Name and phone are genuinely unknown here. They are stored as empty
    // strings rather than invented, so anything reading this row can tell a
    // partial lead from a complete one without consulting `source`.
    const contact = { name: "", email, phone: "" };
    const meta = {
      ...(input.meta ?? {}),
      site: "a1marinestorage.ca",
      page: "/calculator",
      source: "pdf_download",
      quoteRef: input.quoteRef,
    };

    const record = {
      id,
      receivedAt,
      sourceSite: SOURCE_SITE,
      contact,
      quoteInput,
      quote,
      jobberLineItems: lineItems,
      selection: input.selection,
      boat: input.boat,
      meta,
    };

    // (1) Durable record FIRST. A lead we cannot store is a lead we should not
    //     claim to have captured, so a total failure returns ok:false and the
    //     endpoint logs it — loudly, unlike the silence this replaces.
    const stored = await persistLead(
      {
        id,
        receivedAt,
        source: "pdf_download",
        reference: input.quoteRef,
        contact,
        quoteInput,
        quote,
        selection: input.selection,
        boat: input.boat,
        meta,
      },
      "quotes-partial",
      record
    );
    if (!stored.ok) return { ok: false, id, reason: "not_persisted" };

    // (2) Forward, best-effort, exactly as a full submission does.
    void forwardToLeadPipeline("quote", {
      source: "quote",
      sourceSite: SOURCE_SITE,
      site: SOURCE_SITE,
      leadLabel: "A1 MARINE STORAGE — Quote (PDF download)",
      quoteId: id,
      receivedAt,
      name: "",
      email,
      phone: "",
      quoteRef: input.quoteRef ?? "",
      jobberLineItems: lineItems,
      currency: quote.currency,
      subtotalCents: quote.subtotalCents,
      notes: [
        "Source: A1 Marine Storage quote tool (PDF download — email only)",
        input.quoteRef ? `Quote reference: ${input.quoteRef}` : "",
        "No name or phone yet: this customer downloaded a quote and left an email.",
        "",
        ...quote.lineItems.map(
          l => `${l.description} = ${(l.amountCents / 100).toFixed(2)}`
        ),
        `Subtotal (pre-HST): $${(quote.subtotalCents / 100).toFixed(2)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    // (3) The same lead to EmpireVu. `quoteRef` rides in meta, which is the
    //     documented extension point — the envelope's top level is unchanged,
    //     so the golden fixtures stay byte-identical.
    void forwardToEmpireVu(
      buildStorageQuoteEnvelope({
        id,
        receivedAt,
        contact,
        quote,
        jobberLineItems: lineItems,
        quoteRef: input.quoteRef,
        source: "pdf_download",
      })
    );

    // (4) The copy the customer asked for, if mail is configured.
    //
    // ABSENT-SAFE: with no RESEND_API_KEY this logs a skip and returns — which
    // is why the field on the download card says "Save my email with this
    // quote" and not "email me a copy". The label changes in the same change
    // that verifies a real send, never before it.
    if (input.pdf && input.quoteRef && input.resumeUrl) {
      const mail = renderPdfCopyEmail({
        reference: input.quoteRef,
        quote,
        resumeUrl: input.resumeUrl,
        issuedAt: new Date(receivedAt),
      });
      void notify(id, "pdf_copy", "email", {
        to: email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        attachments: [
          {
            filename: `A1-Marine-Storage-Quote-${input.quoteRef}.pdf`,
            content: input.pdf,
            contentType: "application/pdf",
          },
        ],
      });
    }

    console.log(
      `[partial-lead] filed ${id}${input.quoteRef ? ` (${input.quoteRef})` : ""} from a PDF download`
    );
    return { ok: true, id };
  } catch (err) {
    // The download must survive anything that happens in here.
    console.error(
      "[partial-lead] unexpected failure (download unaffected):",
      err instanceof Error ? err.message : String(err)
    );
    return { ok: false, reason: "unexpected" };
  }
}
