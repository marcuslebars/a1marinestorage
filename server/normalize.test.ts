import { describe, expect, it } from "vitest";

import {
  normalizeContact,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "./normalize";

describe("phone numbers", () => {
  // The three shapes a real customer actually types, all one person.
  it.each([
    "(705) 555-1234",
    "705.555.1234",
    "+1 705 555 1234",
    "705-555-1234",
    "7055551234",
  ])("normalises %s to E.164", input => {
    const r = normalizePhone(input);
    expect(r.value).toBe("+17055551234");
    expect(r.valid).toBe(true);
  });

  it("KEEPS an unparseable number rather than discarding it", () => {
    // It is still the only way to reach this person, and a human can dial
    // something the parser could not read.
    const r = normalizePhone("call me at the marina");
    expect(r.value).toBe("call me at the marina");
    expect(r.valid).toBe(false);
  });

  it("marks a too-short number invalid instead of guessing", () => {
    const r = normalizePhone("555-1234");
    expect(r.valid).toBe(false);
  });

  it("handles an empty value without throwing", () => {
    expect(normalizePhone("")).toEqual({ value: "", valid: false });
    expect(normalizePhone(undefined)).toEqual({ value: "", valid: false });
  });

  it("produces exactly what the SMS channel will accept", () => {
    // sms-twilio.ts sends only to /^\+1[2-9]\d{9}$/. Before normalisation, a
    // number typed as "(705) 555-1234" failed that test and the text silently
    // never went.
    expect(normalizePhone("(705) 555-1234").value).toMatch(/^\+1[2-9]\d{9}$/);
  });
});

describe("emails", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Dana@Example.COM ")).toBe("dana@example.com");
  });

  it("survives a non-string", () => {
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(42)).toBe("");
  });
});

describe("names", () => {
  it("collapses whitespace", () => {
    expect(normalizeName("  Dana   Reeve ")).toBe("Dana Reeve");
  });

  it("collapses newlines and tabs too", () => {
    expect(normalizeName("Dana\n\tReeve")).toBe("Dana Reeve");
  });
});

describe("the whole contact", () => {
  it("makes one person out of three ways of typing them", () => {
    const a = normalizeContact({
      name: "Dana  Reeve",
      email: "Dana@Example.com",
      phone: "(705) 555-1234",
    });
    const b = normalizeContact({
      name: " Dana Reeve ",
      email: "dana@example.com ",
      phone: "+1 705 555 1234",
    });
    expect(a).toEqual(b);
  });
});
