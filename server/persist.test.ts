// 1.4 — the durable log has to actually be durable.
//
// The JSONL file lives under QUOTE_LOG_DIR on Railway's ephemeral filesystem
// and does not survive a redeploy. Every quote this site had ever taken was one
// deploy away from gone. Postgres is now the record and the JSONL write is the
// mirror — but the mirror still has to save the lead when the database is
// unreachable, which is what these tests pin.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetForTests, closePool } from "./db/index";
import { handleContactSubmission } from "./contact-handler";
import { handleQuoteSubmission } from "./quote-handler";

const CONTACT = {
  name: "Dana Reeve",
  email: "dana@example.com",
  phone: "705-555-0134",
};

const QUOTE_BODY = {
  contact: CONTACT,
  quoteInput: {
    serviceLine: "storage" as const,
    hullType: "bowrider",
    bundleId: "winter_ready",
    items: [
      { serviceId: "outdoor_storage", lengthFt: 24 },
      { serviceId: "shrink_wrap", lengthFt: 24 },
    ],
  },
};

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "a1-persist-"));
  process.env.QUOTE_LOG_DIR = tmp;
  process.env.STORAGE_WEBHOOK_DISABLED = "1";
  vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ leadId: "lead_test" }), { status: 200 })
  );
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.resetModules();
  // The pool is cached at module scope; a pool built against the unreachable
  // URL must not leak into the next test.
  await closePool().catch(() => {});
  __resetForTests();
  delete process.env.QUOTE_LOG_DIR;
  delete process.env.STORAGE_WEBHOOK_DISABLED;
  delete process.env.DATABASE_URL;
  fs.rmSync(tmp, { recursive: true, force: true });
});

function linesFor(kind: string): Record<string, unknown>[] {
  const file = fs.readdirSync(tmp).find(f => f.startsWith(`${kind}-`));
  if (!file) return [];
  return fs
    .readFileSync(path.join(tmp, file), "utf-8")
    .split("\n")
    .filter(Boolean)
    .map(l => JSON.parse(l));
}

describe("with no database configured (local dev, and production before Phase 0)", () => {
  it("still records a quote and still answers 200", async () => {
    const res = await handleQuoteSubmission(QUOTE_BODY);
    expect(res.status).toBe(200);
    expect(linesFor("quotes")).toHaveLength(1);
  });

  it("still records a contact and still answers 200", async () => {
    const res = await handleContactSubmission(CONTACT);
    expect(res.status).toBe(200);
    expect(linesFor("contacts")).toHaveLength(1);
  });
});

describe("when Postgres is configured but unreachable", () => {
  // The mirror is the whole reason the JSONL write survived Phase 0. A database
  // that is briefly down must cost the yard nothing.
  beforeEach(() => {
    process.env.DATABASE_URL =
      "postgres://nobody@127.0.0.1:1/none?sslmode=disable";
  });

  it("falls back to JSONL and still returns 200 for a quote", async () => {
    const res = await handleQuoteSubmission(QUOTE_BODY);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(linesFor("quotes")).toHaveLength(1);
  }, 20000);

  it("falls back to JSONL and still returns 200 for a contact", async () => {
    const res = await handleContactSubmission(CONTACT);
    expect(res.status).toBe(200);
    expect(linesFor("contacts")).toHaveLength(1);
  }, 20000);
});

describe("when NEITHER store will take the lead", () => {
  it("returns 500 rather than a fake success", async () => {
    // An unwritable log directory: the mirror cannot be written, and no
    // database is configured to catch it.
    process.env.QUOTE_LOG_DIR = path.join(tmp, "file-not-a-dir");
    fs.writeFileSync(process.env.QUOTE_LOG_DIR, "not a directory");

    const res = await handleQuoteSubmission(QUOTE_BODY);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
  });
});

describe("the honeypot is enforced by the HANDLER, not the route", () => {
  // It used to live in server/index.ts only. The Vite dev middleware calls
  // these handlers directly and never saw it, so dev accepted every bot
  // submission that production rejected — and any new caller would have had no
  // protection without noticing.
  it("discards a tripped quote submission and records nothing", async () => {
    const res = await handleQuoteSubmission({
      ...QUOTE_BODY,
      website: "http://spam.example",
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    // No id: nothing was created. A bot is told it succeeded and gets no proof.
    expect(res.body.quoteId).toBeUndefined();
    expect(linesFor("quotes")).toHaveLength(0);
  });

  it("discards a tripped contact submission and records nothing", async () => {
    const res = await handleContactSubmission({
      ...CONTACT,
      website: "http://spam.example",
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(linesFor("contacts")).toHaveLength(0);
  });

  it("lets a real submission through with the field present but empty", async () => {
    const res = await handleContactSubmission({ ...CONTACT, website: "" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTruthy();
    expect(linesFor("contacts")).toHaveLength(1);
  });
});

describe("contacts are normalised before anything stores them", () => {
  // The golden fixtures call buildStorageQuoteEnvelope directly, so they pin
  // the BUILDER's output and say nothing about what the handler feeds it. This
  // is the part that was actually wrong: a phone typed as "(705) 555-1234" was
  // stored verbatim and was then unsendable by SMS, because sms-twilio.ts only
  // sends to +1 followed by ten digits.
  it("stores a quote contact in E.164, lowercased, whitespace collapsed", async () => {
    const res = await handleQuoteSubmission({
      ...QUOTE_BODY,
      contact: {
        name: "  Dana   Reeve ",
        email: "  Dana@Example.COM ",
        phone: "(705) 555-0134",
      },
    });
    expect(res.status).toBe(200);

    const row = linesFor("quotes")[0] as { contact: Record<string, string> };
    expect(row.contact.name).toBe("Dana Reeve");
    expect(row.contact.email).toBe("dana@example.com");
    expect(row.contact.phone).toBe("+17055550134");
    // The exact shape the SMS channel will accept.
    expect(row.contact.phone).toMatch(/^\+1[2-9]\d{9}$/);
  });

  it("does the same for a contact submission, so one person is one person", async () => {
    await handleContactSubmission({
      name: "Dana  Reeve",
      email: "DANA@example.com",
      phone: "705.555.0134",
    });
    const row = linesFor("contacts")[0] as { contact: Record<string, string> };
    expect(row.contact.email).toBe("dana@example.com");
    expect(row.contact.phone).toBe("+17055550134");
  });

  it("still accepts — and keeps — a number it could not parse", async () => {
    // Unparseable is not the same as unusable: a human can dial it. Dropping
    // the lead over formatting would be worse than storing it as typed.
    const res = await handleContactSubmission({
      name: "Dana Reeve",
      email: "dana@example.com",
      phone: "705 555 0134 ext 22",
    });
    expect(res.status).toBe(200);
    const row = linesFor("contacts")[0] as { contact: Record<string, string> };
    expect(row.contact.phone).toContain("705");
  });
});
