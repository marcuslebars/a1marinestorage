// The internal copy. Written for the yard, not the customer.
//
// Its whole job is the first line: does this one need a phone call, or will it
// quote itself? Everything else is there so that question can be answered
// without opening another system.
//
// This is the ONE email that always sends, whatever happened with EmpireVu — a
// lead the yard never hears about is the failure the whole brief is about.
import type { QuoteResult } from "@a1/pricing-engine";

import {
  extraLabel,
  type ExtraLineRef,
} from "../../../client/src/lib/quote-items";
import { REASON_TEXT, type Eligibility } from "../../eligibility";
import type { RenderedEmail } from "../types";
import {
  escapeHtml,
  money,
  renderLayout,
  renderLineTable,
  renderText,
} from "./layout";

export interface OwnerAlertInput {
  reference?: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    marina?: string;
    boatMakeModelYear?: string;
  };
  quote: QuoteResult;
  extras: ExtraLineRef[];
  eligibility: Eligibility;
  boat?: {
    lengthFt?: number | null;
    hullType?: string | null;
    engineType?: string | null;
    engineCount?: number | null;
  };
  logistics?: Record<string, unknown>;
  depositUrl?: string;
  source?: string;
}

function logisticsLines(log?: Record<string, unknown>): string[] {
  if (!log) return [];
  const out: string[] = [];
  const town = typeof log.townSlug === "string" ? log.townSlug : undefined;
  const band =
    typeof log.transportBand === "string" ? log.transportBand : undefined;
  if (log.boatLocation) out.push(`Boat is: ${String(log.boatLocation)}`);
  if (town) out.push(`Town: ${town}${band ? ` (${band})` : ""}`);
  // `false` is a real answer — "they tow it in, we deliver in spring" is a
  // different job from "no transport", and collapsing them would misinform the
  // person reading this.
  if (log.pickup !== undefined)
    out.push(`Fall pickup: ${log.pickup ? "yes" : "no"}`);
  if (log.delivery !== undefined)
    out.push(`Spring delivery: ${log.delivery ? "yes" : "no"}`);
  if (log.trailerProvided === true)
    out.push("Customer leaves their own trailer");
  return out;
}

export function renderOwnerAlertEmail(input: OwnerAlertInput): RenderedEmail {
  const { contact, quote, eligibility } = input;
  const purposeByIndex = new Map(input.extras.map(e => [e.index, e.purpose]));
  const lines = quote.lineItems.map((l, i) => ({
    label: extraLabel(l.label, purposeByIndex.get(i)),
    amountCents: l.amountCents,
  }));

  const verdict = eligibility.autoQuoteEligible
    ? input.depositUrl
      ? "Auto-quoted — deposit link sent"
      : "Eligible for auto-quote (EmpireVu did not return a link)"
    : "NEEDS A CALL";

  const reasonLines = eligibility.reasons.map(r => REASON_TEXT[r]);

  const boat = input.boat
    ? [
        input.boat.lengthFt ? `${input.boat.lengthFt} ft` : "",
        input.boat.hullType ?? "",
        input.boat.engineCount && input.boat.engineType
          ? `${input.boat.engineCount}× ${input.boat.engineType}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const facts = [
    `${contact.name} · ${contact.phone} · ${contact.email}`,
    boat ? `Boat: ${boat}` : "",
    contact.boatMakeModelYear ? `Make/model: ${contact.boatMakeModelYear}` : "",
    contact.marina ? `Marina: ${contact.marina}` : "",
    input.reference ? `Reference: ${input.reference}` : "",
    input.source ? `Captured from: ${input.source}` : "",
    ...logisticsLines(input.logistics),
  ].filter(Boolean);

  const heading = `${verdict} — ${money(quote.subtotalCents)}`;

  // The reasons block is what makes this scannable: red heading, plain list,
  // nothing else competing with it.
  const reasonsHtml = reasonLines.length
    ? `<div style="margin:16px 0;padding:12px 16px;border-left:3px solid #DE3C37;background:#fdf2f2">
         <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#111">Why it needs a look</p>
         <ul style="margin:0;padding-left:18px;font-size:14px;color:#111">
           ${reasonLines.map(r => `<li style="margin:2px 0">${escapeHtml(r)}</li>`).join("")}
         </ul>
       </div>`
    : "";

  return {
    subject: `[${eligibility.autoQuoteEligible ? "auto" : "CALL"}] ${contact.name} — ${money(quote.subtotalCents)}${input.reference ? ` (${input.reference})` : ""}`,
    html: renderLayout({
      heading,
      intro: facts,
      bodyHtml:
        reasonsHtml +
        renderLineTable(lines, {
          subtotalCents: quote.subtotalCents,
          savingsCents: quote.bundleSavingsCents,
        }),
      cta: input.depositUrl
        ? { label: "View the quote EmpireVu sent", url: input.depositUrl }
        : undefined,
    }),
    text: renderText({
      heading,
      lines: [
        ...facts,
        "",
        ...(reasonLines.length
          ? ["Why it needs a look:", ...reasonLines.map(r => `  - ${r}`), ""]
          : []),
        ...lines.map(l => `${l.label}  ${money(l.amountCents)}`),
        `Subtotal (pre-HST): ${money(quote.subtotalCents)}`,
      ],
      cta: input.depositUrl
        ? { label: "Quote link", url: input.depositUrl }
        : undefined,
    }),
  };
}
