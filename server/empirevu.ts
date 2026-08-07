// A1 Marine Storage → EmpireVu dual-send.
//
// Additive: this forwards the SAME lead to EmpireVu's canonical /api/intake, in
// parallel with (and never affecting) the legacy-hub forward in lead-pipeline.ts.
// Best-effort by design — an EmpireVu outage costs only EmpireVu's copy of the
// lead; the durable log + legacy hub are unaffected. Envelope shape is the shared
// contract in docs/LEAD_SCHEMA.md; the golden fixtures pin this builder's output.
import { createHmac } from "node:crypto";

export const SOURCE_SITE = "a1marinestorage";

export interface LeadLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface LeadEnvelope {
  schemaVersion: 1;
  source: string;
  sourceSite: string;
  formType: "quote" | "contact" | "booking" | "winter-storage-quote";
  receivedAt: string;
  contact: { name?: string; email?: string; phone?: string };
  message?: string;
  lineItems?: LeadLineItem[];
  asset?: { makeModel?: string; lengthFt?: number; type?: string; marina?: string };
  meta?: { site?: string; page?: string; preferredDate?: string; preferredTime?: string; utm?: Record<string, string>; locality?: string };
}

// ── Builders (spoke-specific mapping → canonical envelope) ───────────────────

function parseFeet(value?: string): number | undefined {
  if (!value) return undefined;
  const n = Number.parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function compact<T extends Record<string, unknown>>(obj: T): T | undefined {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return Object.keys(out).length ? (out as T) : undefined;
}

function joinText(...parts: Array<string | undefined>): string | undefined {
  const text = parts.filter((p): p is string => Boolean(p && p.trim())).join("\n\n");
  return text || undefined;
}

export function buildStorageContactEnvelope(input: {
  id: string;
  receivedAt: string;
  contact: { name: string; email: string; phone: string; boatMakeModel?: string; boatLength?: string; serviceInterest?: string; message?: string };
  utm?: Record<string, string>;
  page?: string;
  formType?: LeadEnvelope["formType"];
  locality?: string;
}): LeadEnvelope {
  const c = input.contact;
  return {
    schemaVersion: 1,
    source: input.formType === "winter-storage-quote" ? "a1marinestorage-winter-quote" : "a1marinestorage-contact",
    sourceSite: SOURCE_SITE,
    formType: input.formType ?? "contact",
    receivedAt: input.receivedAt,
    contact: { name: c.name, email: c.email, phone: c.phone },
    message: joinText(c.serviceInterest ? `Service interest: ${c.serviceInterest}` : undefined, c.message),
    asset: compact({ makeModel: c.boatMakeModel, lengthFt: parseFeet(c.boatLength) }),
    // utm/locality dropped by compact() when absent → unchanged output for plain contact leads (golden-safe).
    meta: compact({ site: "a1marinestorage.ca", page: input.page ?? "/contact", utm: input.utm, locality: input.locality }) ?? {
      site: "a1marinestorage.ca",
    },
  };
}

export function buildStorageQuoteEnvelope(input: {
  id: string;
  receivedAt: string;
  contact: { name: string; email: string; phone: string; boatMakeModelYear?: string; marina?: string };
  quote: { hullType?: string | null; subtotalCents: number; bundle?: { label: string } | null; lineItems: Array<{ detail: { lengthFt?: number | null } }> };
  jobberLineItems: LeadLineItem[];
  utm?: Record<string, string>;
}): LeadEnvelope {
  const c = input.contact;
  const q = input.quote;
  const lengthFt = q.lineItems.find((l) => l.detail.lengthFt != null)?.detail.lengthFt ?? undefined;
  const summary = joinText(
    q.bundle ? `Package: ${q.bundle.label}` : "À la carte",
    `Subtotal (pre-HST): $${(q.subtotalCents / 100).toFixed(2)}`,
  );
  return {
    schemaVersion: 1,
    source: "a1marinestorage-quote",
    sourceSite: SOURCE_SITE,
    formType: "quote",
    receivedAt: input.receivedAt,
    contact: { name: c.name, email: c.email, phone: c.phone },
    message: summary,
    lineItems: input.jobberLineItems,
    asset: compact({ makeModel: c.boatMakeModelYear, type: q.hullType ?? undefined, marina: c.marina, lengthFt }),
    meta: compact({ site: "a1marinestorage.ca", page: "/calculator", utm: input.utm }) ?? { site: "a1marinestorage.ca" },
  };
}

// ── Forwarder (best-effort, HMAC-signed) ─────────────────────────────────────

export function signEmpireVuBody(rawBody: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fan out an envelope to EmpireVu's /api/intake. Never throws. Skips cleanly if
 * unconfigured or disabled — the legacy hub + durable log remain the source of truth.
 */
export async function forwardToEmpireVu(envelope: LeadEnvelope, attempts = 3): Promise<void> {
  if (process.env.EMPIREVU_INTAKE_DISABLED === "1") return;
  const url = process.env.EMPIREVU_INTAKE_URL;
  const secret = process.env.EMPIREVU_INTAKE_SECRET;
  if (!url || !secret) {
    console.log("[empirevu] EMPIREVU_INTAKE_URL/SECRET not set — skipping (legacy hub + durable log unaffected)");
    return;
  }
  const rawBody = JSON.stringify(envelope);
  const headers = { "Content-Type": "application/json", "x-empirevu-signature": signEmpireVuBody(rawBody, secret) };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: rawBody });
      if (res.ok) {
        console.log(`[empirevu] forwarded ${envelope.formType} (attempt ${attempt}, ${res.status})`);
        return;
      }
      console.error(`[empirevu] responded ${res.status} (attempt ${attempt})`);
    } catch (err) {
      console.error(`[empirevu] forward failed (attempt ${attempt}):`, err instanceof Error ? err.message : String(err));
    }
    if (attempt < attempts) await sleep(attempt * 750);
  }
  console.error(`[empirevu] gave up after ${attempts} attempts — legacy hub + durable log still hold the lead`);
}
