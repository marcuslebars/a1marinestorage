// Who gets told what, when a quote is submitted.
//
// THE RULE THAT IS EASY TO GET WRONG: the customer's confirmation EMAIL is sent
// only when EmpireVu returned no depositUrl. When a payable link exists,
// EmpireVu has already emailed the customer its own quote, and that one is the
// confirmation — two emails about one quote, arriving seconds apart and
// disagreeing about what to do next, is worse than one.
//
// The SMS and the owner alert are NOT conditional. EmpireVu sends no SMS, and a
// lead the yard never hears about is the failure this phase exists to prevent.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: Array<{
  kind: string;
  channel: string;
  to: string;
  subject?: string;
  text: string;
}> = [];

// Intercept at notify(), the seam every send goes through. Mocking the
// providers instead would test Resend's SDK, not our decisions.
vi.mock("./notify/notify", () => ({
  notify: vi.fn(
    async (
      _id: string,
      kind: string,
      channel: string,
      msg: { to: string; subject?: string; text: string }
    ) => {
      sent.push({
        kind,
        channel,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      });
      return { ok: true };
    }
  ),
}));

const { handleQuoteSubmission } = await import("./quote-handler");

const CONTACT = {
  name: "Dana Reeve",
  email: "dana@example.com",
  phone: "+17055550134",
};
const QUOTE_INPUT = {
  serviceLine: "storage" as const,
  hullType: "bowrider",
  bundleId: "winter_ready",
  items: [
    { serviceId: "outdoor_storage", lengthFt: 24 },
    { serviceId: "shrink_wrap", lengthFt: 24 },
  ],
};
const META = {
  boat: {
    lengthFt: 24,
    hullType: "bowrider",
    engineType: "outboard",
    engineCount: 1,
  },
  selection: {
    mode: "bundle",
    bundleId: "winter_ready",
    alacarteIds: [],
    ceramicUpgrade: false,
  },
  logistics: {
    boatLocation: "home_trailer",
    transportBand: "local",
    pickup: true,
    delivery: false,
  },
};

let tmp: string;

/** Let the unawaited notification work settle before asserting. */
const flush = () => new Promise(resolve => setTimeout(resolve, 30));

function mockEmpireVu(quoteUrl?: string) {
  vi.spyOn(global, "fetch").mockImplementation((async (url: string) => {
    if (String(url).includes("empirevu")) {
      return new Response(
        JSON.stringify({
          ok: true,
          leadId: "lead_1",
          ...(quoteUrl ? { quoteUrl } : {}),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("{}", { status: 200 });
  }) as never);
}

beforeEach(() => {
  sent.length = 0;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "a1-notif-"));
  process.env.QUOTE_LOG_DIR = tmp;
  process.env.STORAGE_WEBHOOK_DISABLED = "1";
  process.env.EMPIREVU_INTAKE_URL = "https://api.empirevu.test/api/intake";
  process.env.EMPIREVU_INTAKE_SECRET = "s";
  process.env.OWNER_ALERT_EMAIL = "yard@a1marinestorage.ca";
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const k of [
    "QUOTE_LOG_DIR",
    "STORAGE_WEBHOOK_DISABLED",
    "EMPIREVU_INTAKE_URL",
    "EMPIREVU_INTAKE_SECRET",
    "OWNER_ALERT_EMAIL",
  ])
    delete process.env[k];
  fs.rmSync(tmp, { recursive: true, force: true });
});

const of = (kind: string, channel: string) =>
  sent.filter(s => s.kind === kind && s.channel === channel);

describe("when EmpireVu returns NO deposit link", () => {
  beforeEach(() => mockEmpireVu());

  it("sends the customer a confirmation email", async () => {
    await handleQuoteSubmission({
      contact: CONTACT,
      quoteInput: QUOTE_INPUT,
      meta: META,
    });
    await flush();
    const mail = of("quote_confirmation", "email");
    expect(mail).toHaveLength(1);
    expect(mail[0].to).toBe("dana@example.com");
    expect(mail[0].text).toContain(
      "confirm availability within 1 business day"
    );
  });

  it("sends the SMS too", async () => {
    await handleQuoteSubmission({
      contact: CONTACT,
      quoteInput: QUOTE_INPUT,
      meta: META,
    });
    await flush();
    expect(of("quote_confirmation", "sms")).toHaveLength(1);
  });

  it("alerts the yard", async () => {
    await handleQuoteSubmission({
      contact: CONTACT,
      quoteInput: QUOTE_INPUT,
      meta: META,
    });
    await flush();
    const alert = of("owner_alert", "email");
    expect(alert).toHaveLength(1);
    expect(alert[0].to).toBe("yard@a1marinestorage.ca");
  });
});

describe("when EmpireVu DOES return a deposit link", () => {
  beforeEach(() => mockEmpireVu("https://quotes.a1marinestorage.ca/q/tok"));

  it("does NOT send our confirmation email — EmpireVu's quote email is the confirmation", async () => {
    await handleQuoteSubmission({
      contact: CONTACT,
      quoteInput: QUOTE_INPUT,
      meta: META,
    });
    await flush();
    expect(of("quote_confirmation", "email")).toHaveLength(0);
  });

  it("still sends the SMS, because EmpireVu sends none", async () => {
    await handleQuoteSubmission({
      contact: CONTACT,
      quoteInput: QUOTE_INPUT,
      meta: META,
    });
    await flush();
    const sms = of("quote_confirmation", "sms");
    expect(sms).toHaveLength(1);
    // And it carries the link, not a pointer to an email we did not send.
    expect(sms[0].text).toContain("https://quotes.a1marinestorage.ca/q/tok");
    expect(sms[0].text).not.toContain("Details are in your email");
  });

  it("still alerts the yard", async () => {
    await handleQuoteSubmission({
      contact: CONTACT,
      quoteInput: QUOTE_INPUT,
      meta: META,
    });
    await flush();
    expect(of("owner_alert", "email")).toHaveLength(1);
  });
});

describe("the owner alert flags what needs a person", () => {
  beforeEach(() => mockEmpireVu());

  it("marks an in-water boat as needing a call", async () => {
    await handleQuoteSubmission({
      contact: CONTACT,
      quoteInput: QUOTE_INPUT,
      meta: {
        ...META,
        logistics: { ...META.logistics, boatLocation: "lift_or_water" },
      },
    });
    await flush();
    expect(of("owner_alert", "email")[0].subject).toContain("[CALL]");
  });

  it("marks an ordinary quote as auto", async () => {
    await handleQuoteSubmission({
      contact: CONTACT,
      quoteInput: QUOTE_INPUT,
      meta: META,
    });
    await flush();
    expect(of("owner_alert", "email")[0].subject).toContain("[auto]");
  });
});

describe("notifications never affect the submission", () => {
  it("still returns 200 when every send throws", async () => {
    mockEmpireVu();
    const { notify } = await import("./notify/notify");
    (
      notify as unknown as { mockImplementation: (f: unknown) => void }
    ).mockImplementation(async () => {
      throw new Error("mail provider is on fire");
    });

    const res = await handleQuoteSubmission({
      contact: CONTACT,
      quoteInput: QUOTE_INPUT,
      meta: META,
    });
    await flush();
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
