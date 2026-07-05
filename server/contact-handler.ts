// A1 Marine Storage — contact submission handler.
//
// Same pattern as the quote handler (shares server/lead-pipeline): write a
// durable server-side record FIRST, report success only after it's written, then
// forward to the shared A1 lead pipeline (source-tagged a1marinestorage-contact)
// with retries. The customer never sees a fake success.

import { randomUUID } from "node:crypto";
import { SOURCE_SITE, appendSubmission, forwardToLeadPipeline } from "./lead-pipeline";

const LEAD_TAG = "a1marinestorage-contact";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactSubmission {
  name: string;
  email: string;
  phone: string;
  boatMakeModel?: string;
  boatLength?: string;
  serviceInterest?: string;
  message?: string;
}

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

function validate(raw: unknown): { ok: true; contact: ContactSubmission } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Missing contact details." };
  const c = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(c.name);
  const email = str(c.email);
  const phone = str(c.phone);
  if (name.length < 2) return { ok: false, error: "A name is required." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "A valid email is required." };
  if (phone.replace(/\D/g, "").length < 7) return { ok: false, error: "A valid phone number is required." };
  return {
    ok: true,
    contact: {
      name,
      email,
      phone,
      boatMakeModel: str(c.boatMakeModel) || undefined,
      boatLength: str(c.boatLength) || undefined,
      serviceInterest: str(c.serviceInterest) || undefined,
      message: str(c.message) || undefined,
    },
  };
}

export async function handleContactSubmission(rawBody: unknown): Promise<HandlerResult> {
  const check = validate(rawBody);
  if (!check.ok) return { status: 400, body: { ok: false, error: check.error } };
  const contact = check.contact;

  const id = randomUUID();
  const receivedAt = new Date().toISOString();
  const record = { id, receivedAt, source: LEAD_TAG, sourceSite: SOURCE_SITE, contact };

  // (1) Durable record FIRST — success only after this succeeds.
  try {
    appendSubmission("contacts", receivedAt, record);
  } catch (err) {
    console.error("[contact] failed to persist durable record:", err instanceof Error ? err.message : String(err));
    return { status: 500, body: { ok: false, error: "We couldn't record your message. Please try again." } };
  }

  // (2) Forward to the shared A1 lead pipeline, source-tagged, with retries.
  const forwardPayload: Record<string, unknown> = {
    source: "contact",
    sourceSite: SOURCE_SITE,
    site: SOURCE_SITE,
    leadTag: LEAD_TAG,
    leadLabel: "A1 MARINE STORAGE — Contact",
    contactId: id,
    receivedAt,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    boatMakeModel: contact.boatMakeModel ?? "",
    boatLength: contact.boatLength ?? "",
    service: contact.serviceInterest ?? "",
    message: contact.message ?? "",
    notes: [
      "Source: A1 Marine Storage contact form",
      contact.boatMakeModel ? `Boat: ${contact.boatMakeModel}` : "",
      contact.boatLength ? `Length: ${contact.boatLength} ft` : "",
      contact.serviceInterest ? `Interest: ${contact.serviceInterest}` : "",
      "",
      contact.message ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
  void forwardToLeadPipeline("contact", forwardPayload);

  return { status: 200, body: { ok: true, id, submittedAt: receivedAt } };
}
