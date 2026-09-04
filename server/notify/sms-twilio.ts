// SMS via Twilio.
//
// CANADIAN NUMBERS ONLY, and only ones that survived E.164 normalisation. A
// number we could not parse is not a number we should text: at best it fails
// and costs money, at worst it reaches a stranger. The customer still gets the
// email, which carries everything the SMS would have said.
import twilio from "twilio";

import type { Channel, Message, SendResult } from "./types";

/** +1 followed by ten digits, with no leading 0 or 1 in the area code. */
const CA_E164 = /^\+1[2-9]\d{9}$/;

/**
 * Is this a number we are willing to send to?
 *
 * Exported because the honest answer at the CALL site is "skip", not "try and
 * fail" — a caller checks first so it can record a skip with a reason.
 */
export function isSendableNumber(to: string): boolean {
  return CA_E164.test(to.trim());
}

let client: ReturnType<typeof twilio> | null = null;

export const smsChannel: Channel = {
  name: "twilio",

  isConfigured(): boolean {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM
    );
  },

  async send(msg: Message): Promise<SendResult> {
    if (!this.isConfigured()) {
      return { ok: false, reason: "Twilio env not set" };
    }
    if (!isSendableNumber(msg.to)) {
      // Not a transient failure — this number will never be sendable, so the
      // reason says so rather than inviting a retry.
      return { ok: false, reason: `not a Canadian E.164 number: ${msg.to}` };
    }

    if (!client) {
      client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    try {
      const res = await client.messages.create({
        to: msg.to.trim(),
        from: process.env.TWILIO_FROM as string,
        body: msg.text,
      });
      return { ok: true, providerId: res.sid };
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
