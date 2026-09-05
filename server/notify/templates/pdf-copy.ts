// "Here's the quote you just downloaded" — the email behind the optional field
// on the download card.
//
// Carries three things the customer needs later and will not remember: the
// reference to quote on the phone, the link that reopens the calculator with
// their selections intact, and the date the prices stop being current.
import type { QuoteResult } from "@a1/pricing-engine";

import type { RenderedEmail } from "../types";
import { money, renderLayout, renderLineTable, renderText } from "./layout";

/** Quotes are honoured 30 days from issue. The PDF says so; so does this. */
export const QUOTE_VALID_DAYS = 30;

export function validUntil(issuedAt: Date): string {
  const d = new Date(issuedAt);
  d.setDate(d.getDate() + QUOTE_VALID_DAYS);
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export interface PdfCopyInput {
  reference: string;
  quote: QuoteResult;
  resumeUrl: string;
  issuedAt?: Date;
}

export function renderPdfCopyEmail(input: PdfCopyInput): RenderedEmail {
  const { reference, quote, resumeUrl } = input;
  const until = validUntil(input.issuedAt ?? new Date());
  const heading = "Your storage quote is attached";

  const intro = [
    `Your quote is attached as a PDF. Its reference is ${reference} — quote that when you call and we'll pull up exactly this.`,
    `These prices are held until ${until}.`,
  ];

  const outro = [
    "The link above reopens the calculator with your boat and selections already filled in, so you can change something without starting over.",
    "Nothing is booked yet. Reply to this email or call the yard when you're ready.",
  ];

  const lines = quote.lineItems.map(l => ({
    label: l.description,
    amountCents: l.amountCents,
  }));

  return {
    subject: `Your A1 Marine Storage quote ${reference}`,
    html: renderLayout({
      heading,
      intro,
      bodyHtml: renderLineTable(lines, {
        subtotalCents: quote.subtotalCents,
        savingsCents: quote.bundleSavingsCents,
      }),
      cta: { label: "Pick up where you left off", url: resumeUrl },
      outro,
    }),
    text: renderText({
      heading,
      lines: [
        ...intro,
        "",
        ...quote.lineItems.map(
          l => `${l.description}  ${money(l.amountCents)}`
        ),
        `Subtotal (pre-HST): ${money(quote.subtotalCents)}`,
        "",
        ...outro,
      ],
      cta: { label: "Pick up where you left off", url: resumeUrl },
    }),
  };
}
