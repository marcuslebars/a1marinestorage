import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: Array<{ kind: string; to: string; text: string; html?: string }> =
  [];

vi.mock("./notify/notify", () => ({
  notify: vi.fn(
    async (
      _id: string,
      kind: string,
      _channel: string,
      msg: { to: string; text: string; html?: string }
    ) => {
      sent.push({ kind, to: msg.to, text: msg.text, html: msg.html });
      return { ok: true };
    }
  ),
}));

const { handleQuoteSave, savedKind } = await import("./quote-save-handler");

const SELECTION = {
  mode: "bundle" as const,
  bundleId: "winter_ready",
  alacarteIds: [],
  ceramicUpgrade: false,
};
const BOAT = {
  lengthFt: 24,
  hullType: "bowrider",
  engineType: "outboard" as const,
  engineCount: 1,
};

let tmp: string;

beforeEach(() => {
  sent.length = 0;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "a1-save-"));
  process.env.QUOTE_LOG_DIR = tmp;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.QUOTE_LOG_DIR;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("saving a quote by email", () => {
  it("records it and sends the link", async () => {
    const res = await handleQuoteSave({
      email: "Dana@Example.COM",
      selection: SELECTION,
      boat: BOAT,
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(sent).toHaveLength(1);
    // Normalised, like every other path, so one person stays one person.
    expect(sent[0].to).toBe("dana@example.com");
  });

  it("puts a resume link in the email, not a price the customer sent", async () => {
    await handleQuoteSave({
      email: "dana@example.com",
      selection: SELECTION,
      boat: BOAT,
      origin: "https://a1marinestorage.ca",
    });
    expect(sent[0].text).toContain("/calculator?q=");
  });

  it("carries an unsubscribe link — this is a marketing-adjacent send", async () => {
    await handleQuoteSave({
      email: "dana@example.com",
      selection: SELECTION,
      boat: BOAT,
      origin: "https://a1marinestorage.ca",
    });
    expect(sent[0].text).toContain("/api/unsubscribe?t=");
    expect(sent[0].html).toContain("/api/unsubscribe?t=");
  });

  it("prices through the engine — the request carries no money", async () => {
    await handleQuoteSave({
      email: "dana@example.com",
      selection: { ...SELECTION, subtotalCents: 1 } as never,
      boat: BOAT,
    });
    // The engine's number, not the one in the body.
    expect(sent[0].text).not.toContain("$0.01");
  });

  it("buckets the idempotency key by DAY, so a retry loop cannot mail thirty times", () => {
    const a = savedKind(new Date("2026-09-05T09:00:00Z"));
    const b = savedKind(new Date("2026-09-05T23:59:00Z"));
    const c = savedKind(new Date("2026-09-06T00:01:00Z"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toBe("quote_saved:2026-09-05");
  });
});

describe("what it refuses", () => {
  it("rejects a bad address without recording anything", async () => {
    const res = await handleQuoteSave({
      email: "not-an-email",
      selection: SELECTION,
      boat: BOAT,
    });
    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("rejects a selection the engine cannot price", async () => {
    const res = await handleQuoteSave({
      email: "dana@example.com",
      selection: { mode: null, alacarteIds: [] },
      boat: BOAT,
    });
    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });
});
