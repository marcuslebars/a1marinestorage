// 1.1 — a PDF download that volunteers only an email is a LEAD, not a reject.
//
// Before this handler existed, `/api/quote/pdf` filed that email by calling
// handleQuoteSubmission with `name: ""` and `phone: ""`. validateContact
// answers `{ ok: false, error: "A name is required." }` — a RETURN VALUE, not a
// throw — so the endpoint's `.catch()` never fired, nothing was written, and
// nothing was logged. The warmest lead on the site vanished silently.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handlePartialQuoteLead } from "./partial-lead-handler";

const SELECTION = {
  mode: "bundle" as const,
  bundleId: "winter_ready",
  alacarteIds: [],
  ceramicUpgrade: false,
};
const BOAT = {
  lengthFt: 24,
  hullType: "runabout",
  engineType: "outboard" as const,
  engineCount: 1,
};

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "a1-partial-"));
  process.env.QUOTE_LOG_DIR = tmp;
  // No outbound calls in tests: the durable record is what is under test.
  process.env.STORAGE_WEBHOOK_DISABLED = "1";
  vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ leadId: "lead_test" }), { status: 200 })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.QUOTE_LOG_DIR;
  delete process.env.STORAGE_WEBHOOK_DISABLED;
  fs.rmSync(tmp, { recursive: true, force: true });
});

function mirrorLines(): Record<string, unknown>[] {
  const file = fs
    .readdirSync(tmp)
    .find(f => f.startsWith("quotes-partial-") && f.endsWith(".jsonl"));
  if (!file) return [];
  return fs
    .readFileSync(path.join(tmp, file), "utf-8")
    .split("\n")
    .filter(Boolean)
    .map(l => JSON.parse(l));
}

describe("a PDF download with only an email", () => {
  it("produces a durable record instead of being silently rejected", async () => {
    const res = await handlePartialQuoteLead({
      email: "skipper@example.com",
      selection: SELECTION,
      boat: BOAT,
      quoteRef: "A1MS-Q-ABC123",
    });

    expect(res.ok).toBe(true);
    const rows = mirrorLines();
    expect(rows).toHaveLength(1);
    expect((rows[0].contact as Record<string, string>).email).toBe(
      "skipper@example.com"
    );
  });

  it("records the quote reference printed on the PDF, so the two can be tied together", async () => {
    await handlePartialQuoteLead({
      email: "skipper@example.com",
      selection: SELECTION,
      boat: BOAT,
      quoteRef: "A1MS-Q-ABC123",
    });
    const meta = mirrorLines()[0].meta as Record<string, unknown>;
    expect(meta.quoteRef).toBe("A1MS-Q-ABC123");
    expect(meta.source).toBe("pdf_download");
  });

  it("re-prices through the engine — the request carries no money and none is read", async () => {
    await handlePartialQuoteLead({
      email: "skipper@example.com",
      // A hand-crafted body trying to dictate a price. There is nowhere to put
      // one, and the engine's answer is what gets stored.
      selection: { ...SELECTION, subtotalCents: 1 } as never,
      boat: BOAT,
      quoteRef: "A1MS-Q-ABC123",
    });
    const quote = mirrorLines()[0].quote as { subtotalCents: number };
    expect(quote.subtotalCents).toBeGreaterThan(1);
  });

  it("forwards an EmpireVu envelope carrying the reference", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://api.empirevu.test/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "test-secret";

    await handlePartialQuoteLead({
      email: "skipper@example.com",
      selection: SELECTION,
      boat: BOAT,
      quoteRef: "A1MS-Q-ABC123",
    });
    // The forward is fire-and-forget on purpose — the download must never wait
    // on it — so let the already-resolved mock settle before inspecting it.
    await new Promise(resolve => setImmediate(resolve));

    const calls = (global.fetch as unknown as { mock: { calls: unknown[][] } })
      .mock.calls;
    const intake = calls.find(c => String(c[0]).includes("empirevu"));
    expect(intake, "an EmpireVu envelope should have been sent").toBeTruthy();

    const envelope = JSON.parse(String((intake![1] as RequestInit).body));
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.formType).toBe("quote");
    expect(envelope.meta.quoteRef).toBe("A1MS-Q-ABC123");
    expect(envelope.meta.source).toBe("pdf_download");
    expect(envelope.contact.email).toBe("skipper@example.com");

    delete process.env.EMPIREVU_INTAKE_URL;
    delete process.env.EMPIREVU_INTAKE_SECRET;
  });

  it("rejects a body with no usable email rather than filing an empty lead", async () => {
    const res = await handlePartialQuoteLead({
      email: "not-an-address",
      selection: SELECTION,
      boat: BOAT,
    });
    expect(res.ok).toBe(false);
    expect(mirrorLines()).toHaveLength(0);
  });

  it("rejects a selection the engine cannot price", async () => {
    const res = await handlePartialQuoteLead({
      email: "skipper@example.com",
      selection: { mode: null, alacarteIds: [] },
      boat: BOAT,
    });
    expect(res.ok).toBe(false);
    expect(mirrorLines()).toHaveLength(0);
  });
});
