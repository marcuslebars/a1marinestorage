// "Here's the link back to your quote."
//
// Short on purpose. This person gave an address and nothing else; they are not
// committing to anything, and an email that behaves like a sales pitch is how
// that address stops being useful.
//
// One job: the link back. Everything else is context so they recognise which
// quote it is when they open it three days later.
import type { QuoteResult } from "@a1/pricing-engine";

import type { BoatState } from "../../../client/src/lib/quote-items";
import type { RenderedEmail } from "../types";
import { money, renderLayout, renderText, unsubscribeFooter } from "./layout";

export interface QuoteSavedInput {
  quote: QuoteResult;
  resumeUrl: string;
  boat?: BoatState;
  unsubscribeUrl: string;
}

function boatLine(boat?: BoatState): string | null {
  if (!boat?.lengthFt) return null;
  return boat.hullType
    ? `Your ${boat.lengthFt} ft ${boat.hullType}`
    : `Your ${boat.lengthFt} ft boat`;
}

export function renderQuoteSavedEmail(input: QuoteSavedInput): RenderedEmail {
  const heading = "Your quote, saved";
  const boat = boatLine(input.boat);

  const intro = [
    boat
      ? `${boat} — ${money(input.quote.subtotalCents)} before HST.`
      : `${money(input.quote.subtotalCents)} before HST.`,
    "The link below reopens the calculator exactly where you left it, so you can change something or finish when you're ready.",
  ];

  const outro = [
    "Prices are today's — we'll re-check them when you come back.",
    "Nothing is booked, and nobody will chase you.",
  ];

  const cta = { label: "Open my quote", url: input.resumeUrl };

  return {
    subject: "Your A1 Marine Storage quote — the link back",
    html: renderLayout({
      heading,
      intro,
      cta,
      outro,
      footerHtml: unsubscribeFooter(input.unsubscribeUrl),
    }),
    text: renderText({
      heading,
      lines: [...intro, "", ...outro],
      cta,
      unsubscribeUrl: input.unsubscribeUrl,
    }),
  };
}
