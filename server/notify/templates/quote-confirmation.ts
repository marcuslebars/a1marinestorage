// "We've got your storage quote" — the email a customer gets on submit.
//
// WHEN IT SENDS. Only when EmpireVu returned NO depositUrl. When a payable
// quote link exists, EmpireVu sends its own quote email and that one IS the
// confirmation; sending ours too would mean two emails about one quote, arriving
// together, disagreeing about what to do next. The caller decides; this file
// only renders.
//
// The rows and labels match the on-screen breakdown exactly — same extraLabel,
// so a fall pickup and a spring delivery are told apart here as well.
import type { QuoteResult } from "@a1/pricing-engine";

import {
  extraLabel,
  type ExtraLineRef,
} from "../../../client/src/lib/quote-items";
import { BUSINESS } from "../../../shared/business";
import type { RenderedEmail } from "../types";
import { money, renderLayout, renderLineTable, renderText } from "./layout";

export interface QuoteConfirmationInput {
  name: string;
  reference?: string;
  quote: QuoteResult;
  extras: ExtraLineRef[];
  resumeUrl?: string;
  /** Already-worded dates, from shared/when-labels, so they match the PDF. */
  preferredDropoff?: string | null;
  preferredLaunch?: string | null;
  /** Present only when EmpireVu auto-quoted; changes what happens next. */
  depositUrl?: string;
  depositPct?: number;
}

/** First name only — "Thanks, Jonathan Michael Reeve" reads like a form letter. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export function renderQuoteConfirmationEmail(
  input: QuoteConfirmationInput
): RenderedEmail {
  const { quote, depositUrl } = input;
  const purposeByIndex = new Map(input.extras.map(e => [e.index, e.purpose]));
  const lines = quote.lineItems.map((l, i) => ({
    label: extraLabel(l.label, purposeByIndex.get(i)),
    amountCents: l.amountCents,
  }));

  const heading = `We've got your storage quote, ${firstName(input.name)}`;

  // REQUESTED, not reserved. Saying "your drop-off is the week of…" would
  // promise a slot nothing has held.
  const dates = [
    input.preferredDropoff ? `Fall drop-off: ${input.preferredDropoff}` : "",
    input.preferredLaunch ? `Spring launch: ${input.preferredLaunch}` : "",
  ].filter(Boolean);

  const intro = [
    input.reference
      ? `Here's what you put together. Your reference is ${input.reference} — quote it when you call and we'll pull up exactly this.`
      : "Here's what you put together.",
  ];

  // WHAT HAPPENS NEXT, and only what actually happens. With a payable link the
  // customer can act now; without one, a person gets in touch, and saying so is
  // better than implying something is already reserved.
  const pct = input.depositPct ?? 25;
  const datesNote = dates.length
    ? [
        `You asked for — ${dates.join(", ")}. We'll confirm availability; nothing is held yet.`,
      ]
    : [];

  const outro = depositUrl
    ? [
        `You can reserve your spot now with a ${pct}% deposit. The balance is due at drop-off.`,
        "Nothing is held until the deposit is paid.",
      ]
    : [
        "We'll confirm availability within 1 business day and get back to you.",
        "Nothing is booked yet — this is your quote, not a reservation.",
      ];

  const cta = depositUrl
    ? { label: `Reserve my spot (${pct}% deposit)`, url: depositUrl }
    : input.resumeUrl
      ? { label: "Change something on this quote", url: input.resumeUrl }
      : undefined;

  const address = `${BUSINESS.address.street}, ${BUSINESS.address.city}, ${BUSINESS.address.regionName}`;

  return {
    subject: input.reference
      ? `Your A1 Marine Storage quote ${input.reference}`
      : "Your A1 Marine Storage quote",
    html: renderLayout({
      heading,
      intro,
      bodyHtml: renderLineTable(lines, {
        subtotalCents: quote.subtotalCents,
        savingsCents: quote.bundleSavingsCents,
      }),
      cta,
      outro: [
        ...datesNote,
        ...outro,
        `The yard: ${address} · ${BUSINESS.phone}`,
      ],
    }),
    text: renderText({
      heading,
      // NOT .filter(Boolean) — that would strip the blank lines that separate
      // the paragraphs from the table, and the text part would arrive as one
      // undifferentiated block. Only the genuinely optional row is dropped.
      lines: [
        ...intro,
        "",
        ...lines.map(l => `${l.label}  ${money(l.amountCents)}`),
        ...(quote.bundleSavingsCents > 0
          ? [`Bundle savings  −${money(quote.bundleSavingsCents)}`]
          : []),
        `Subtotal (pre-HST): ${money(quote.subtotalCents)}`,
        "",
        ...datesNote,
        ...(datesNote.length ? [""] : []),
        ...outro,
      ],
      cta,
    }),
  };
}

/**
 * The SMS. One message, under 160 characters — a second segment costs again and
 * reads like a mistake on the customer's phone.
 *
 * Deliberately thin: everything the customer needs is in the email. This exists
 * so the quote reference reaches the one device they always have, and so a
 * payable link is one tap away when there is one.
 */
export function renderQuoteConfirmationSms(input: {
  reference?: string;
  lengthFt?: number | null;
  hullType?: string | null;
  depositUrl?: string;
}): string {
  const ref = input.reference ? ` ${input.reference}` : "";
  const boat =
    input.lengthFt && input.hullType
      ? ` for your ${input.lengthFt} ft ${input.hullType}`
      : "";
  const tail = input.depositUrl
    ? `Reserve: ${input.depositUrl}`
    : "Details are in your email.";
  const msg = `A1 Marine Storage: got your quote${ref}${boat}. ${tail} Reply STOP to opt out.`;

  // Drop the boat description before the reference or the link: those are the
  // parts that do something.
  return msg.length <= 160
    ? msg
    : `A1 Marine Storage: got your quote${ref}. ${tail} Reply STOP to opt out.`;
}
