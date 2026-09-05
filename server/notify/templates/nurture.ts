// The three reminders, in one file because they are three variations on one
// sentence: "your quote is still here".
//
// Every one carries an unsubscribe link. These are the emails we send on our
// own initiative, which is exactly the category that has to be easy to stop.
import type { QuoteResult } from "@a1/pricing-engine";

import type { RenderedEmail } from "../types";
import { money, renderLayout, renderText, unsubscribeFooter } from "./layout";

interface Base {
  resumeUrl: string;
  unsubscribeUrl: string;
  quote?: QuoteResult | null;
  boatLabel?: string | null;
}

function build(
  heading: string,
  intro: string[],
  outro: string[],
  subject: string,
  o: Base
): RenderedEmail {
  const cta = { label: "Open my quote", url: o.resumeUrl };
  return {
    subject,
    html: renderLayout({
      heading,
      intro,
      cta,
      outro,
      footerHtml: unsubscribeFooter(o.unsubscribeUrl),
    }),
    text: renderText({
      heading,
      lines: [...intro, "", ...outro],
      cta,
      unsubscribeUrl: o.unsubscribeUrl,
    }),
  };
}

/** Two hours after a quote was built and left. */
export function renderAbandoned2h(o: Base): RenderedEmail {
  const total = o.quote ? ` — ${money(o.quote.subtotalCents)} before HST` : "";
  return build(
    "Your quote is ready when you are",
    [
      `You put together a storage quote earlier today${total}.`,
      "It's still here, exactly as you left it.",
    ],
    [
      "No rush, and nothing is booked. If it's easier to talk it through, the yard picks up the phone.",
    ],
    "Your A1 Marine Storage quote is still here",
    o
  );
}

/**
 * Three days later, with capacity if — and only if — we actually know it.
 *
 * `spotsLeft` is passed in from live data. When it is null the email says
 * nothing about availability rather than reaching for urgency it cannot back
 * up; a made-up "filling fast" is the exact thing the brief forbids.
 */
export function renderAbandoned3d(
  o: Base & { spotsLeft?: number | null; weekLabel?: string | null }
): RenderedEmail {
  const scarcity =
    typeof o.spotsLeft === "number" && o.spotsLeft > 0 && o.spotsLeft <= 40
      ? o.weekLabel
        ? `${o.weekLabel} is filling — ${o.spotsLeft} ${o.spotsLeft === 1 ? "spot" : "spots"} left across the season.`
        : `${o.spotsLeft} ${o.spotsLeft === 1 ? "spot" : "spots"} left for the season.`
      : null;

  return build(
    "Still thinking it over?",
    [
      "Your storage quote from a few days ago is still saved.",
      ...(scarcity ? [scarcity] : []),
    ],
    [
      scarcity
        ? "Booking early is the only way to hold a week."
        : "Whenever you're ready — the link below picks up where you left off.",
    ],
    "Your winter storage quote — still saved",
    o
  );
}

/** Day 25 of a 30-day quote: the prices are about to stop being current. */
export function renderExpiryD25(
  o: Base & { validUntil: string }
): RenderedEmail {
  return build(
    "Your prices hold until " + o.validUntil,
    [
      `The quote you built is honoured until ${o.validUntil}.`,
      "After that we'd re-price it — usually the same, but we won't promise a number we haven't checked.",
    ],
    ["Open it below to book, or to change something before it lapses."],
    `Your A1 Marine Storage quote expires ${o.validUntil}`,
    o
  );
}
