// POST /api/quote/save — "email me the link to this quote".
//
// The lightest possible commitment: an address, and nothing else asked for.
// Someone at Step 2 who is not ready to give a name and phone can still leave
// with something, and the yard still has a lead.
//
// Rate-limited to one per address per day through the notifications unique
// key, not a counter. The key IS the lock: two tabs, a double click, or a
// retried request all lose the same insert race.
import { randomUUID } from "node:crypto";

import { calculateQuote, type QuoteResult } from "@a1/pricing-engine";

import {
  buildStorageQuoteInput,
  type BoatState,
  type Selection,
} from "../client/src/lib/quote-items";
import { SOURCE_SITE } from "./lead-pipeline";
import { normalizeEmail } from "./normalize";
import { notify } from "./notify/notify";
import { renderQuoteSavedEmail } from "./notify/templates/quote-saved";
import { persistLead } from "./persist";
import { encodeResumeToken, resumeUrlFor } from "./resume-token";
import { unsubscribeUrl } from "./unsubscribe";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SaveQuoteRequest {
  email: string;
  selection: Selection;
  boat: BoatState;
  origin?: string;
}

export interface SaveHandlerResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * The idempotency kind, bucketed by DAY.
 *
 * `quote_saved:2026-09-05` means the unique key on
 * (quote_id, kind, channel) allows exactly one send per quote per day. A
 * customer who saves three variations of their quote gets three emails — they
 * asked for three — but a stuck retry loop cannot mail them thirty.
 */
export function savedKind(now = new Date()): string {
  return `quote_saved:${now.toISOString().slice(0, 10)}`;
}

export async function handleQuoteSave(
  req: unknown
): Promise<SaveHandlerResult> {
  const body = (req ?? {}) as Partial<SaveQuoteRequest>;
  const email = normalizeEmail(body.email);

  if (!EMAIL_RE.test(email)) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "Enter an email address and we'll send the link.",
      },
    };
  }

  const input = buildStorageQuoteInput(
    body.selection as Selection,
    body.boat as BoatState
  );
  if (!input) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "Choose a package or at least one service first.",
      },
    };
  }

  // Server-authoritative, as everywhere: the request carries a selection and
  // the engine prices it here.
  let quote: QuoteResult;
  try {
    quote = calculateQuote(input);
  } catch {
    return {
      status: 400,
      body: { ok: false, error: "We couldn't price that selection." },
    };
  }

  const id = randomUUID();
  const receivedAt = new Date().toISOString();
  const contact = { name: "", email, phone: "" };
  const origin =
    body.origin || process.env.PUBLIC_BASE_URL || "https://a1marinestorage.ca";
  const resumeUrl = resumeUrlFor(
    encodeResumeToken({ selection: body.selection, boat: body.boat }),
    origin
  );

  // Durable record first, same as every other path. A saved quote the yard
  // cannot see is not a saved quote.
  const stored = await persistLead(
    {
      id,
      receivedAt,
      source: "saved",
      contact,
      quoteInput: input,
      quote,
      selection: body.selection,
      boat: body.boat,
      meta: {
        site: "a1marinestorage.ca",
        page: "/calculator",
        source: "saved",
      },
    },
    "quotes-saved",
    {
      id,
      receivedAt,
      sourceSite: SOURCE_SITE,
      contact,
      quoteInput: input,
      quote,
      selection: body.selection,
      boat: body.boat,
    }
  );
  if (!stored.ok) {
    return {
      status: 500,
      body: {
        ok: false,
        error: "We couldn't save your quote. Please try again.",
      },
    };
  }

  const mail = renderQuoteSavedEmail({
    quote,
    resumeUrl,
    boat: body.boat as BoatState,
    unsubscribeUrl: unsubscribeUrl(email, origin),
  });

  // Awaited, unlike the confirmation sends: the customer is watching a button
  // that says "email me the link", and telling them it worked before knowing
  // would be the fake success this codebase does not do.
  const sent = await notify(id, savedKind(), "email", {
    to: email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  // `duplicate` means today's send already went — which from the customer's
  // point of view is a success: the email is in their inbox.
  const delivered = sent.ok || sent.duplicate === true;
  return {
    status: 200,
    body: {
      ok: true,
      id,
      // The client says "sent" only when something was actually sent. When mail
      // is unconfigured the quote is still saved, and the copy says that.
      emailed: delivered,
    },
  };
}
