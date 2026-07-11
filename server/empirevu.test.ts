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
  JSON.parse(readFileSync(join(here, "__fixtures__", "lead-envelopes", name), "utf8"));

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
        lineItems: [{ detail: { lengthFt: 24 } }, { detail: {} }, { detail: {} }],
      },
      jobberLineItems: [
        { description: "Shrink Wrap (24ft)", quantity: 1, unitPriceCents: 41400 },
        { description: "Pontoon hull surcharge", quantity: 1, unitPriceCents: 5000 },
        { description: "Winterization — I/O", quantity: 1, unitPriceCents: 27500 },
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

  it("signs + posts when configured", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    const spy = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    globalThis.fetch = spy as never;
    await forwardToEmpireVu(envelope);
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hub.example/api/intake");
    expect((opts.headers as Record<string, string>)["x-empirevu-signature"]).toBe(
      signEmpireVuBody(opts.body as string, "s"),
    );
  });

  it("never throws when the endpoint fails", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as never;
    await expect(forwardToEmpireVu(envelope, 1)).resolves.toBeUndefined();
  });
});
