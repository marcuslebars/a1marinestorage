// 1.5 — the honeypot has to be wired to something.
//
// Phase 0 shipped `isHoneypotTripped()` on /api/quote and /api/contact, and no
// form rendered the field it looks for. The check ran on every request, found
// nothing, and passed everything: a security control that cannot fail is not a
// security control. These tests fail if that regresses — either by a form
// dropping the field, or by the two `website` strings drifting apart.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { HONEYPOT_FIELD as CLIENT_FIELD } from "./HoneypotField";
import { HONEYPOT_FIELD as SERVER_FIELD } from "../../../server/security/honeypot";

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf-8");

const FORMS = [
  "client/src/pages/Calculator.tsx",
  "client/src/pages/Contact.tsx",
  "client/src/components/QuoteRequestForm.tsx",
];

describe("the honeypot", () => {
  it("uses the same field name on both sides — a drift here silently disables it", () => {
    expect(CLIENT_FIELD).toBe(SERVER_FIELD);
  });

  it.each(FORMS)("is rendered by %s", file => {
    expect(read(file)).toContain("<HoneypotField");
  });

  it.each(FORMS)("is actually sent in the payload from %s", file => {
    // Rendering it without submitting it is the same as not having it.
    expect(read(file)).toMatch(/website: honeypot/);
  });
});

describe("the two contact forms agree on what a valid contact is", () => {
  // Contact.tsx used `form.name && form.email && form.phone`, which passes "a",
  // "x" and "1" — the button enabled, the server then rejected it, and the
  // customer got a generic failure after submitting instead of a marked field.
  it("Contact.tsx validates length, email shape and phone digits", () => {
    const src = read("client/src/pages/Contact.tsx");
    expect(src).toMatch(/form\.name\.trim\(\)\.length >= 2/);
    expect(src).toMatch(/form\.phone\.replace\(\/\\D\/g, ""\)\.length >= 7/);
    expect(src).toMatch(/emailOk/);
  });

  it("QuoteRequestForm.tsx still does the same", () => {
    const src = read("client/src/components/QuoteRequestForm.tsx");
    expect(src).toMatch(/form\.name\.trim\(\)\.length >= 2/);
    expect(src).toMatch(/form\.phone\.replace\(\/\\D\/g, ""\)\.length >= 7/);
  });
});
