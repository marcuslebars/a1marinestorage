import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildStorageContactEnvelope,
  buildStorageQuoteEnvelope,
  forwardToEmpireVu,
  signEmpireVuBody,
  type LeadEnvelope,
} from "./empirevu";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(
    readFileSync(join(here, "__fixtures__", "lead-envelopes", name), "utf8")
  );

describe("storage envelope builders match the golden fixtures (drift guard)", () => {
  it("contact -> canonical envelope", () => {
    const env = buildStorageContactEnvelope({
      id: "c1",
      receivedAt: "2026-07-10T12:00:00.000Z",
      contact: {
        name: "Pat Quinn",
        email: "pat@example.com",
        phone: "(705) 555-0166",
        boatMakeModel: "Catalina 27",
        boatLength: "27",
        serviceInterest: "Winter storage",
        message: "Do you store sailboats over winter?",
      },
    });
    expect(env).toEqual(fixture("storage-contact.json"));
  });

  it("quote -> canonical envelope (line items + hull + utm)", () => {
    const env = buildStorageQuoteEnvelope({
      id: "q1",
      receivedAt: "2026-07-10T15:20:00.000Z",
      contact: {
        name: "Marcus Reed",
        email: "marcus@example.com",
        phone: "705-555-0199",
        boatMakeModelYear: "2019 Sylvan Mirage",
        marina: "Bayfield",
      },
      quote: {
        hullType: "pontoon",
        subtotalCents: 141312,
        bundle: { label: "Winter Ready" },
        lineItems: [
          { detail: { lengthFt: 24 } },
          { detail: {} },
          { detail: {} },
        ],
      },
      jobberLineItems: [
        {
          description: "Shrink Wrap (24ft)",
          quantity: 1,
          unitPriceCents: 41400,
        },
        {
          description: "Pontoon hull surcharge",
          quantity: 1,
          unitPriceCents: 5000,
        },
        {
          description: "Winterization — I/O",
          quantity: 1,
          unitPriceCents: 27500,
        },
      ],
      utm: { utm_source: "google", utm_campaign: "fall-storage" },
    });
    expect(env).toEqual(fixture("storage-quote.json"));
  });
});

describe("forwardToEmpireVu is additive + best-effort", () => {
  const envelope: LeadEnvelope = {
    schemaVersion: 1,
    source: "a1marinestorage-contact",
    sourceSite: "a1marinestorage",
    formType: "contact",
    receivedAt: "2026-07-10T12:00:00.000Z",
    contact: { email: "a@b.com" },
  };
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.EMPIREVU_INTAKE_URL;
    delete process.env.EMPIREVU_INTAKE_SECRET;
    delete process.env.EMPIREVU_INTAKE_DISABLED;
  });

  it("does not call out when unconfigured", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as never;
    await forwardToEmpireVu(envelope);
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not call out when disabled", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    process.env.EMPIREVU_INTAKE_DISABLED = "1";
    const spy = vi.fn();
    globalThis.fetch = spy as never;
    await forwardToEmpireVu(envelope);
    expect(spy).not.toHaveBeenCalled();
  });

  const intakeOk = (extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ ok: true, leadId: "lead_1", ...extra }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  it("signs + posts when configured", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    const spy = vi.fn(async () => intakeOk());
    globalThis.fetch = spy as never;
    await forwardToEmpireVu(envelope);
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hub.example/api/intake");
    expect(
      (opts.headers as Record<string, string>)["x-empirevu-signature"]
    ).toBe(signEmpireVuBody(opts.body as string, "s"));
  });

  it("never throws when the endpoint fails", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as never;
    // Reports failure rather than throwing. The caller uses this to decide
    // whether it can offer a deposit link; it must never decide by catching.
    await expect(forwardToEmpireVu(envelope, 1)).resolves.toEqual({
      ok: false,
    });
  });

  it("returns the quote link when the intake supplies one", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    globalThis.fetch = (async () =>
      intakeOk({ quoteUrl: "https://quotes.example/q/tok" })) as never;
    // leadId is returned as well as quoteUrl: it is already parsed as the proof
    // this response came from the real intake, and the caller stores it against
    // the quote row so the two systems can be reconciled later.
    await expect(forwardToEmpireVu(envelope, 1)).resolves.toEqual({
      ok: true,
      quoteUrl: "https://quotes.example/q/tok",
      leadId: "lead_1",
    });
  });

  it("a 200 of MARKETING HTML is not a delivered lead", async () => {
    // The production failure this guards. empirevu.com serves an SPA whose
    // catch-all answers any unmatched path with 200 + index.html. Pointed there,
    // the forwarder logged success and every lead vanished.
    process.env.EMPIREVU_INTAKE_URL = "https://empirevu.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    globalThis.fetch = (async () =>
      new Response(
        "<!doctype html><html><title>EmpireVu — Early Access</title></html>",
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      )) as never;
    await expect(forwardToEmpireVu(envelope, 1)).resolves.toEqual({
      ok: false,
    });
  });

  it("a 200 with JSON but no leadId is not a delivered lead either", async () => {
    // A proxy or health endpoint answering {ok:true} would otherwise pass.
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as never;
    await expect(forwardToEmpireVu(envelope, 1)).resolves.toEqual({
      ok: false,
    });
  });

  it("retries an unconfirmed 200 rather than accepting it", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    const calls = vi.fn();
    globalThis.fetch = (async () => {
      calls();
      return new Response("<html></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }) as never;
    await forwardToEmpireVu(envelope, 3);
    // Worth retrying: a transient proxy page should not silently drop a lead.
    expect(calls).toHaveBeenCalledTimes(3);
  });

  it("reading the body cannot itself cause a re-post", async () => {
    // A body reader that throws must not escape into the retry loop as an
    // exception — it is a failed confirmation, handled by the same path.
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    const calls = vi.fn();
    globalThis.fetch = (async () => {
      calls();
      return { ok: true, status: 200 } as unknown as Response; // no .json()
    }) as never;
    await expect(forwardToEmpireVu(envelope, 1)).resolves.toEqual({
      ok: false,
    });
    expect(calls).toHaveBeenCalledTimes(1);
  });
});

/**
 * EmpireVu refuses to auto-quote a winterization lead without a known engine
 * type — "not sure" is a real answer on the form and must not be guessed. This
 * envelope omitted engineType entirely, so every storage quote arrived as engine
 * "none" and was declined:
 *
 *   [auto-quote] lead … not auto-quoted (unknown_engine_type):
 *                engine type "none" cannot be priced
 *
 * The site had the answer the whole time and was already logging it to
 * analytics; it just never put it in the envelope.
 */
describe("the envelope carries the engine so a lead can be auto-quoted", () => {
  const base = {
    id: "q1",
    receivedAt: "2026-09-01T15:00:00.000Z",
    contact: {
      name: "Pat Quinn",
      email: "pat@example.com",
      phone: "705-555-0100",
    },
    jobberLineItems: [],
  };

  it("takes the type and count from the priced winterization line", () => {
    const env = buildStorageQuoteEnvelope({
      ...base,
      quote: {
        hullType: "cruiser",
        subtotalCents: 201750,
        bundle: { label: "Winter Ready Plus" },
        lineItems: [
          { detail: { lengthFt: 24 } },
          {
            detail: {
              type: "flat_per_engine",
              engineType: "outboard",
              engineCount: 1,
            },
          },
        ],
      },
    });
    expect(env.asset).toMatchObject({
      lengthFt: 24,
      engineType: "outboard",
      engineCount: 1,
    });
  });

  it("carries a multi-engine count", () => {
    const env = buildStorageQuoteEnvelope({
      ...base,
      quote: {
        hullType: null,
        subtotalCents: 300000,
        bundle: null,
        lineItems: [
          {
            detail: {
              type: "flat_per_engine",
              engineType: "sterndrive",
              engineCount: 2,
            },
          },
        ],
      },
    });
    expect(env.asset).toMatchObject({
      engineType: "sterndrive",
      engineCount: 2,
    });
  });

  it("omits the engine entirely for a quote with no winterization", () => {
    // Storage-only quotes must serialise exactly as they did before, which is
    // what keeps the golden fixtures valid.
    const env = buildStorageQuoteEnvelope({
      ...base,
      quote: {
        hullType: null,
        subtotalCents: 120000,
        bundle: null,
        lineItems: [{ detail: { lengthFt: 22 } }],
      },
    });
    expect(env.asset).not.toHaveProperty("engineType");
    expect(env.asset).not.toHaveProperty("engineCount");
  });

  it("reads the engine from the QUOTE, so it cannot disagree with what was priced", () => {
    const env = buildStorageQuoteEnvelope({
      ...base,
      quote: {
        hullType: null,
        subtotalCents: 100000,
        bundle: null,
        lineItems: [
          {
            detail: {
              type: "flat_per_engine",
              engineType: "inboard",
              engineCount: 1,
            },
          },
        ],
      },
    });
    expect(env.asset?.engineType).toBe("inboard");
  });
});
