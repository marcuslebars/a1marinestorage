#!/usr/bin/env node
/**
 * Prove the notification providers actually deliver.
 *
 * Deliberately NOT part of `vitest`: it sends real email and real SMS, costs
 * money, and needs live credentials. The unit tests mock the providers, which
 * means they can pass while a key is wrong or a domain is unverified — exactly
 * the failure this catches.
 *
 *   pnpm notify:smoke -- --to you@example.com
 *   pnpm notify:smoke -- --sms +17055551234
 *   pnpm notify:smoke -- --to you@example.com --sms +17055551234
 */
import { emailChannel } from "../server/notify/email-resend.ts";
import { smsChannel } from "../server/notify/sms-twilio.ts";

const args = process.argv.slice(2);
const arg = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const to = arg("--to");
const sms = arg("--sms");

if (!to && !sms) {
  console.error("Nothing to do. Pass --to <email> and/or --sms <+1...>");
  process.exit(1);
}

let failures = 0;
const stamp = new Date().toISOString();

if (to) {
  if (!emailChannel.isConfigured()) {
    console.error("FAIL  email: RESEND_API_KEY is not set");
    failures++;
  } else {
    const r = await emailChannel.send({
      to,
      subject: `A1 Marine Storage — notification smoke test ${stamp}`,
      text: `This is a smoke test sent at ${stamp}. If you are reading it, Resend is wired up correctly.`,
      html: `<p>This is a smoke test sent at <strong>${stamp}</strong>.</p><p>If you are reading it, Resend is wired up correctly.</p>`,
    });
    if (r.ok) console.log(`ok    email -> ${to}  (${r.providerId})`);
    else {
      console.error(`FAIL  email -> ${to}: ${r.reason}`);
      failures++;
    }
  }
}

if (sms) {
  if (!smsChannel.isConfigured()) {
    console.error(
      "FAIL  sms: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM not all set"
    );
    failures++;
  } else {
    const r = await smsChannel.send({
      to: sms,
      text: `A1 Marine Storage smoke test ${stamp}`,
    });
    if (r.ok) console.log(`ok    sms   -> ${sms}  (${r.providerId})`);
    else {
      console.error(`FAIL  sms   -> ${sms}: ${r.reason}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll configured channels delivered.");
