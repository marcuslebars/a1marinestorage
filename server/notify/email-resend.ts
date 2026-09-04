// Email via Resend.
//
// Absent-safe: with no RESEND_API_KEY the channel reports unconfigured and every
// send is skipped. That is what keeps local dev and CI from needing a key, and
// what stops a missing secret in production from turning into an exception in a
// request handler.
import { Resend } from "resend";

import type { Channel, Message, SendResult } from "./types";

const DEFAULT_FROM = "A1 Marine Storage <bookings@a1marinestorage.ca>";
const DEFAULT_REPLY_TO = "contact@a1marinestorage.ca";

function from(): string {
  return process.env.MAIL_FROM || DEFAULT_FROM;
}

function replyTo(): string {
  return process.env.MAIL_REPLY_TO || DEFAULT_REPLY_TO;
}

/**
 * A copy of every customer email to the yard, when set.
 *
 * BCC rather than CC: the customer must not see an internal address, and must
 * not be able to reply-all into it.
 */
function bccOwner(): string | undefined {
  const v = process.env.MAIL_BCC_OWNER?.trim();
  return v || undefined;
}

let client: Resend | null = null;

export const emailChannel: Channel = {
  name: "resend",

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
  },

  async send(msg: Message): Promise<SendResult> {
    if (!this.isConfigured()) {
      return { ok: false, reason: "RESEND_API_KEY not set" };
    }
    if (!msg.subject) {
      // A subjectless email is a bug in the caller, not a transient failure.
      return { ok: false, reason: "email requires a subject" };
    }

    if (!client) client = new Resend(process.env.RESEND_API_KEY);

    try {
      const { data, error } = await client.emails.send({
        from: from(),
        to: [msg.to],
        bcc: bccOwner() ? [bccOwner() as string] : undefined,
        replyTo: msg.replyTo || replyTo(),
        subject: msg.subject,
        // Both parts, always: a text-only client must still get a usable email,
        // and a message with no text part scores badly with spam filters.
        text: msg.text,
        html: msg.html,
        attachments: msg.attachments?.map(a => ({
          filename: a.filename,
          content: a.content.toString("base64"),
        })),
      });

      if (error) {
        return { ok: false, reason: `${error.name}: ${error.message}` };
      }
      return { ok: true, providerId: data?.id };
    } catch (err) {
      // Never let a provider outage reach the caller as an exception.
      return {
        ok: false,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
