import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * notify() exists to make one guarantee: a given (quote, kind, channel) is sent
 * AT MOST ONCE, no matter how many times the code path runs. Cron overlaps, a
 * retried handler and a double-click all converge here.
 *
 * The lock is the database, claimed BEFORE the send. Check-then-send would leave
 * a race exactly wide enough for a customer to receive the same email twice.
 */

const claims = new Set<string>();
let dbOk = true;
let dbConfigured = true;

vi.mock("../db/index", () => ({
  isConfigured: () => dbConfigured,
  query: vi.fn(async (sql: string, params: unknown[] = []) => {
    if (!dbOk) return { rows: [], rowCount: 0, ok: false };
    const key = `${params[0]}|${params[1]}|${params[2]}`;
    if (/insert into notifications/i.test(sql)) {
      if (claims.has(key)) return { rows: [], rowCount: 0, ok: true }; // on conflict do nothing
      claims.add(key);
      return { rows: [{ id: 1 }], rowCount: 1, ok: true };
    }
    if (/delete from notifications/i.test(sql)) {
      claims.delete(key);
      return { rows: [], rowCount: 1, ok: true };
    }
    return { rows: [], rowCount: 0, ok: true };
  }),
}));

const emailSend = vi.fn(async () => ({ ok: true, providerId: "re_1" }));
const smsSend = vi.fn(async () => ({ ok: true, providerId: "SM1" }));
let emailConfigured = true;
let smsConfigured = true;

vi.mock("./email-resend", () => ({
  emailChannel: {
    name: "resend",
    isConfigured: () => emailConfigured,
    send: (m: unknown) => emailSend(m as never),
  },
}));
vi.mock("./sms-twilio", () => ({
  smsChannel: {
    name: "twilio",
    isConfigured: () => smsConfigured,
    send: (m: unknown) => smsSend(m as never),
  },
  isSendableNumber: (to: string) => /^\+1[2-9]\d{9}$/.test(to),
}));

const { notify } = await import("./notify");

const msg = { to: "pat@example.com", subject: "Hi", text: "hello" };

beforeEach(() => {
  claims.clear();
  dbOk = true;
  dbConfigured = true;
  emailConfigured = true;
  smsConfigured = true;
  emailSend.mockClear();
  smsSend.mockClear();
  emailSend.mockResolvedValue({ ok: true, providerId: "re_1" });
});
afterEach(() => vi.clearAllMocks());

describe("sends once, ever", () => {
  it("sends the first time", async () => {
    const r = await notify("q1", "quote_confirmation", "email", msg);
    expect(r.ok).toBe(true);
    expect(emailSend).toHaveBeenCalledTimes(1);
  });

  it("does not send the second time", async () => {
    await notify("q1", "quote_confirmation", "email", msg);
    const r = await notify("q1", "quote_confirmation", "email", msg);
    expect(r.duplicate).toBe(true);
    // The whole point: the provider is never asked a second time.
    expect(emailSend).toHaveBeenCalledTimes(1);
  });

  it("treats a different kind as a different message", async () => {
    await notify("q1", "quote_confirmation", "email", msg);
    await notify("q1", "expiry_d25", "email", msg);
    expect(emailSend).toHaveBeenCalledTimes(2);
  });

  it("treats a different channel as a different message", async () => {
    await notify("q1", "quote_confirmation", "email", msg);
    await notify("q1", "quote_confirmation", "sms", {
      to: "+17055551234",
      text: "hi",
    });
    expect(emailSend).toHaveBeenCalledTimes(1);
    expect(smsSend).toHaveBeenCalledTimes(1);
  });

  it("claims BEFORE sending, so concurrent callers cannot both send", async () => {
    // Two runs starting together — the shape of two overlapping cron ticks.
    const [a, b] = await Promise.all([
      notify("q1", "abandoned_2h", "email", msg),
      notify("q1", "abandoned_2h", "email", msg),
    ]);
    expect(emailSend).toHaveBeenCalledTimes(1);
    expect([a.duplicate, b.duplicate].filter(Boolean)).toHaveLength(1);
  });
});

describe("a failed send can be retried", () => {
  it("releases the claim so a later run tries again", async () => {
    emailSend.mockResolvedValueOnce({
      ok: false,
      reason: "provider down",
    } as never);
    const first = await notify("q1", "quote_confirmation", "email", msg);
    expect(first.ok).toBe(false);

    // Without the release, a transient outage would permanently suppress this
    // message — the customer would simply never receive it.
    const second = await notify("q1", "quote_confirmation", "email", msg);
    expect(second.ok).toBe(true);
    expect(emailSend).toHaveBeenCalledTimes(2);
  });

  it("never throws when the provider throws", async () => {
    emailSend.mockRejectedValueOnce(new Error("socket hang up"));
    const r = await notify("q1", "quote_confirmation", "email", msg);
    // A failed notification must not fail the thing it was reporting on.
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/socket hang up/);
  });
});

describe("unconfigured providers are skipped, not failed", () => {
  it("skips email with no API key", async () => {
    emailConfigured = false;
    const r = await notify("q1", "quote_confirmation", "email", msg);
    expect(r).toMatchObject({ ok: false, skipped: true });
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("skips an unsendable number WITHOUT burning the idempotency key", async () => {
    smsConfigured = true;
    const bad = await notify("q1", "quote_confirmation", "sms", {
      to: "555-1234",
      text: "hi",
    });
    expect(bad.skipped).toBe(true);
    expect(smsSend).not.toHaveBeenCalled();

    // Claiming a skip would block the retry after the number is corrected.
    const good = await notify("q1", "quote_confirmation", "sms", {
      to: "+17055551234",
      text: "hi",
    });
    expect(good.ok).toBe(true);
  });
});

describe("no database", () => {
  it("still sends — at-least-once beats never", async () => {
    dbConfigured = false;
    const r = await notify("q1", "quote_confirmation", "email", msg);
    expect(r.ok).toBe(true);
  });

  it("sends when the database is unreachable, rather than staying silent", async () => {
    dbOk = false;
    const r = await notify("q1", "quote_confirmation", "email", msg);
    // A duplicate email is recoverable; a missing one is not.
    expect(r.ok).toBe(true);
  });
});
