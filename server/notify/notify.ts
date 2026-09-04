// notify() — send once, ever, per (quote, kind, channel).
//
// THE DATABASE IS THE LOCK. `notifications` has a unique key on
// (quote_id, kind, channel), and this claims the row BEFORE sending. Two cron
// runs overlapping, a retried handler, a double-clicked button — only one wins
// the insert, and only the winner sends. Checking-then-sending would leave a
// race exactly wide enough for a customer to get the same email twice.
//
// NEVER THROWS. A failed notification must not fail the thing it was reporting
// on: the quote is already recorded, and an email that did not go is a worse
// outcome than an email that did, but not a reason to 500.
import { isConfigured as dbConfigured, query } from "../db/index";
import { emailChannel } from "./email-resend";
import { isSendableNumber, smsChannel } from "./sms-twilio";
import type { Channel, Message, SendResult } from "./types";

export type NotifyChannel = "email" | "sms";

const CHANNELS: Record<NotifyChannel, Channel> = {
  email: emailChannel,
  sms: smsChannel,
};

export interface NotifyResult extends SendResult {
  /** True when the send was skipped because it had already been sent. */
  duplicate?: boolean;
  /** True when the provider is not configured — expected in dev, not an error. */
  skipped?: boolean;
}

/**
 * Claim the right to send, atomically.
 *
 * Returns false when another caller already holds it. With no database there is
 * nothing to claim, so the send proceeds and the caller accepts that
 * at-most-once becomes at-least-once — which is the correct trade in dev, and
 * why production must have DATABASE_URL.
 */
async function claim(
  quoteId: string | null,
  kind: string,
  channel: NotifyChannel
): Promise<boolean> {
  if (!dbConfigured() || !quoteId) return true;
  const res = await query(
    `insert into notifications (quote_id, kind, channel)
     values ($1, $2, $3)
     on conflict (quote_id, kind, channel) do nothing
     returning id`,
    [quoteId, kind, channel]
  );
  // ok=false means the database was unreachable. Sending is the safer failure:
  // a duplicate email is recoverable, a silently missing one is not.
  if (!res.ok) return true;
  return res.rowCount > 0;
}

/** Record the provider's id against a claim we already hold. */
async function recordProviderId(
  quoteId: string | null,
  kind: string,
  channel: NotifyChannel,
  providerId?: string
): Promise<void> {
  if (!dbConfigured() || !quoteId || !providerId) return;
  await query(
    `update notifications set provider_id = $4
     where quote_id = $1 and kind = $2 and channel = $3 and provider_id is null`,
    [quoteId, kind, channel, providerId]
  );
}

/** Release a claim whose send failed, so a later run can try again. */
async function release(
  quoteId: string | null,
  kind: string,
  channel: NotifyChannel
): Promise<void> {
  if (!dbConfigured() || !quoteId) return;
  await query(
    `delete from notifications
     where quote_id = $1 and kind = $2 and channel = $3 and provider_id is null`,
    [quoteId, kind, channel]
  );
}

export async function notify(
  quoteId: string | null,
  kind: string,
  channel: NotifyChannel,
  message: Message
): Promise<NotifyResult> {
  const ch = CHANNELS[channel];

  try {
    if (!ch.isConfigured()) {
      console.log(`[notify] ${channel} not configured — skipped (${kind})`);
      return { ok: false, skipped: true, reason: `${channel} not configured` };
    }

    // A number we cannot send to is a skip, not a claim: claiming it would burn
    // the idempotency key and block a retry after the number is corrected.
    if (channel === "sms" && !isSendableNumber(message.to)) {
      console.log(
        `[notify] sms skipped for ${kind}: not a Canadian E.164 number`
      );
      return { ok: false, skipped: true, reason: "unsendable number" };
    }

    if (!(await claim(quoteId, kind, channel))) {
      console.log(
        `[notify] ${kind}/${channel} already sent for quote ${quoteId} — skipping`
      );
      return { ok: true, duplicate: true };
    }

    const res = await ch.send(message);

    if (res.ok) {
      await recordProviderId(quoteId, kind, channel, res.providerId);
      console.log(
        `[notify] sent ${kind}/${channel} for quote ${quoteId ?? "(none)"}`
      );
    } else {
      // Give the key back so the nightly job can retry rather than concluding
      // the message was delivered.
      await release(quoteId, kind, channel);
      console.error(
        `[notify] ${kind}/${channel} FAILED for quote ${quoteId ?? "(none)"}: ${res.reason}`
      );
    }
    return res;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[notify] ${kind}/${channel} threw (swallowed): ${reason}`);
    await release(quoteId, kind, channel).catch(() => {});
    return { ok: false, reason };
  }
}
