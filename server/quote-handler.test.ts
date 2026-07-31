import { describe, it, expect } from "vitest";
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
