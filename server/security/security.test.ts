import { describe, expect, it } from "vitest";

import { HONEYPOT_FIELD, isHoneypotTripped } from "./honeypot";
import { isTurnstileEnabled, verifyTurnstile } from "./turnstile";
import { isSendableNumber } from "../notify/sms-twilio";

describe("honeypot", () => {
  it("trips on a filled hidden field", () => {
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "http://spam.example" })).toBe(
      true
    );
  });

  it("does not trip on the empty string a real browser submits", () => {
    // The field is present on every form, so an untouched one arrives as "".
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "" })).toBe(false);
    expect(isHoneypotTripped({ [HONEYPOT_FIELD]: "   " })).toBe(false);
  });

  it("does not trip when the field is absent", () => {
    expect(isHoneypotTripped({ name: "Pat" })).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
    expect(isHoneypotTripped("nonsense")).toBe(false);
  });
});

describe("turnstile is off unless configured", () => {
  it("is disabled with no secret", () => {
    delete process.env.TURNSTILE_SECRET;
    expect(isTurnstileEnabled()).toBe(false);
  });

  it("passes everything through when disabled, with no network call", async () => {
    delete process.env.TURNSTILE_SECRET;
    // Dev and CI must not need a Cloudflare account.
    await expect(verifyTurnstile(undefined)).resolves.toBe(true);
  });

  it("rejects a missing token once enabled", async () => {
    process.env.TURNSTILE_SECRET = "s";
    await expect(verifyTurnstile(undefined)).resolves.toBe(false);
    delete process.env.TURNSTILE_SECRET;
  });
});

describe("sms guards Canadian numbers only", () => {
  it("accepts a normalised Canadian number", () => {
    expect(isSendableNumber("+17055551234")).toBe(true);
  });

  it("refuses anything that did not normalise", () => {
    // Sending to these costs money at best and reaches a stranger at worst.
    for (const n of [
      "705-555-1234",
      "+447700900000",
      "17055551234",
      "",
      "+1705555123",
    ]) {
      expect(isSendableNumber(n), n).toBe(false);
    }
  });

  it("refuses a leading 0 or 1 in the area code", () => {
    expect(isSendableNumber("+11055551234")).toBe(false);
    expect(isSendableNumber("+10055551234")).toBe(false);
  });
});
