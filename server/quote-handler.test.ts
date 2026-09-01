import { afterEach, describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Configure env BEFORE importing the handler (it reads config at module load).
const TMP = path.join(os.tmpdir(), "a1-quote-test");
process.env.STORAGE_WEBHOOK_DISABLED = "1";
process.env.QUOTE_LOG_DIR = TMP;

const load = () => import("./quote-handler");

const validInput = {
  serviceLine: "storage" as const,
  hullType: "bowrider",
  bundleId: "winter_ready",
  items: [
    { serviceId: "outdoor_storage", lengthFt: 24 },
    { serviceId: "shrink_wrap", lengthFt: 24 },
  ],
};
const contact = { name: "Jane Doe", email: "jane@example.com", phone: "705-555-1234" };

describe("storage quote submission handler", () => {
  it("prices server-side, returns 200, and writes a durable record", async () => {
    const { handleQuoteSubmission } = await load();
    const res = await handleQuoteSubmission({ quoteInput: validInput, contact, meta: {} });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // Server recomputes — never trusts the client's number.
    expect(res.body.subtotalCents).toBe(165600);

    const files = fs.readdirSync(TMP).filter((f) => f.startsWith("quotes-"));
    expect(files.length).toBeGreaterThan(0);
    const content = files.map((f) => fs.readFileSync(path.join(TMP, f), "utf-8")).join("");
    expect(content).toContain("165600");
    expect(content).toContain("jane@example.com");
  });

  it("rejects an invalid contact with 400", async () => {
    const { handleQuoteSubmission } = await load();
    const res = await handleQuoteSubmission({ quoteInput: validInput, contact: { name: "", email: "nope", phone: "1" } });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("rejects an absurd quote input with 400 (engine guards)", async () => {
    const { handleQuoteSubmission } = await load();
    const res = await handleQuoteSubmission({
      quoteInput: { serviceLine: "storage", items: [{ serviceId: "outdoor_storage", lengthFt: 0 }] },
      contact,
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-storage / empty body with 400", async () => {
    const { handleQuoteSubmission } = await load();
    expect((await handleQuoteSubmission({})).status).toBe(400);
    expect((await handleQuoteSubmission({ quoteInput: { serviceLine: "storage", items: [] }, contact })).status).toBe(400);
  });
});

/**
 * The confirmation screen offers a deposit only when EmpireVu actually produced
 * a payable quote. Everything here is about the guarantee that asking for that
 * link cannot cost the customer anything: the lead is durably recorded before
 * the forward runs, and the wait for it is capped.
 */
describe("the deposit link is best-effort and never delays the customer", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.EMPIREVU_INTAKE_URL;
    delete process.env.EMPIREVU_INTAKE_SECRET;
  });

  it("returns the link when the intake supplies one", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    globalThis.fetch = (async () =>
      // leadId is required: the forwarder treats a 200 without one as "something
      // answered, but not the intake" — see the marketing-HTML case.
      new Response(JSON.stringify({ ok: true, leadId: "lead_1", quoteUrl: "https://quotes.example/q/tok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as never;

    const { handleQuoteSubmission } = await load();
    const res = await handleQuoteSubmission({ quoteInput: validInput, contact, meta: {} });
    expect(res.status).toBe(200);
    expect(res.body.depositUrl).toBe("https://quotes.example/q/tok");
  });

  it("still succeeds, with no link, when EmpireVu is unreachable", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as never;

    const { handleQuoteSubmission } = await load();
    const res = await handleQuoteSubmission({ quoteInput: validInput, contact, meta: {} });
    // The lead is captured either way; the screen falls back to its old copy.
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.depositUrl).toBeUndefined();
  });

  it("gives up rather than making the customer wait on a hung intake", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    // Never resolves. Without a deadline this would hang the submission — the
    // customer watching a spinner because a background system is unwell.
    globalThis.fetch = (() => new Promise(() => {})) as never;

    const { handleQuoteSubmission } = await load();
    const started = Date.now();
    const res = await handleQuoteSubmission({ quoteInput: validInput, contact, meta: {} });
    const waited = Date.now() - started;

    expect(res.status).toBe(200);
    expect(res.body.depositUrl).toBeUndefined();
    // Capped at 4s; allow headroom for a slow CI box but prove it is bounded.
    expect(waited).toBeLessThan(8000);
  }, 15000);
});
