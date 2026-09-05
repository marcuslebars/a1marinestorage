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
  asset?: {
    makeModel?: string;
    lengthFt?: number;
    type?: string;
    marina?: string;
  };
  // `meta` is the documented extension point: new capture context goes here,
  // never at the top level, and every field is compacted away when unset so the
  // golden fixtures stay byte-identical.
  //
  // The last four were already being emitted by buildStorageQuoteEnvelope while
  // this type claimed they did not exist — it typechecked only because compact()
  // returns a widened object rather than an object literal, which skips excess
  // property checking. Declared here so the contract matches the wire.
  meta?: {
    site?: string;
    page?: string;
    preferredDate?: string;
    preferredTime?: string;
    utm?: Record<string, string>;
    locality?: string;
    logistics?: LeadLogistics;
    selection?: LeadSelection;
    /** A1MS-Q-XXXXXX, when the lead came from a downloaded quote. */
    quoteRef?: string;
    /** Capture route, e.g. `pdf_download`. Absent for an ordinary submission. */
    source?: string;
  };
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
  const text = parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join("\n\n");
  return text || undefined;
}

/**
 * Transport, trailer and add-on selections from the calculator.
 *
 * Rides in `meta`, NOT at the top level. docs/LEAD_SCHEMA.md fixes the envelope's
 * top level at schemaVersion 1 and says to version the contract rather than
 * mutate it; `meta` is the documented capture-context extension point. A
 * top-level `logistics` key would be a schema change EmpireVu validates against.
 *
 * Every field is optional and compacted away when unset, so a quote with no
 * logistics produces byte-identical output to before this existed — which is what
 * keeps the golden fixtures unchanged.
 */
export interface LeadLogistics {
  /** self_transport | home_trailer | marina_ramp | lift_or_water */
  boatLocation?: string;
  /**
   * The town, either way: a slug from our locality list, or a name the customer
   * typed. `bandResolution` says which, so nothing downstream has to guess by
   * inspecting the string.
   */
  town?: string;
  /** local | regional | extended | beyond */
  transportBand?: string;
  distanceKm?: number;
  /**
   * locality | place_estimate — how the band was arrived at. A ratified distance
   * from our own list, or one geocoded from a typed name. Worth telling apart
   * when someone queries a transport charge months later.
   */
  bandResolution?: string;
  pickup?: boolean;
  delivery?: boolean;
  trailerProvided?: boolean;
  /** In-water pickup needs a haul-out plan; there is no priced line for it. */
  inWaterNotice?: boolean;
  batteryCount?: number;
  extendedMonths?: number;
  oilChangeOutboard?: boolean;
  springWrapRemoval?: boolean;
}

/**
 * Compact the logistics block, or drop it entirely.
 *
 * `false` is deliberately PRESERVED: "pickup: false, delivery: true" is a real
 * choice (the customer tows it in and we deliver in spring), and losing it would
 * make a delivery-only quote look like it had no transport at all. Only
 * undefined/null/"" are dropped, so an untouched section vanishes completely.
 */
export function compactLogistics(
  log?: LeadLogistics
): LeadLogistics | undefined {
  if (!log) return undefined;
  return compact(log as Record<string, unknown>) as LeadLogistics | undefined;
}

export function buildStorageContactEnvelope(input: {
  id: string;
  receivedAt: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    boatMakeModel?: string;
    boatLength?: string;
    serviceInterest?: string;
    message?: string;
  };
  utm?: Record<string, string>;
  page?: string;
  formType?: LeadEnvelope["formType"];
  locality?: string;
}): LeadEnvelope {
  const c = input.contact;
  return {
    schemaVersion: 1,
    source:
      input.formType === "winter-storage-quote"
        ? "a1marinestorage-winter-quote"
        : "a1marinestorage-contact",
    sourceSite: SOURCE_SITE,
    formType: input.formType ?? "contact",
    receivedAt: input.receivedAt,
    contact: { name: c.name, email: c.email, phone: c.phone },
    message: joinText(
      c.serviceInterest ? `Service interest: ${c.serviceInterest}` : undefined,
      c.message
    ),
    asset: compact({
      makeModel: c.boatMakeModel,
      lengthFt: parseFeet(c.boatLength),
    }),
    // utm/locality dropped by compact() when absent → unchanged output for plain contact leads (golden-safe).
    meta: compact({
      site: "a1marinestorage.ca",
      page: input.page ?? "/contact",
      utm: input.utm,
      locality: input.locality,
    }) ?? {
      site: "a1marinestorage.ca",
    },
  };
}

/**
 * What the customer chose, by catalog SERVICE KEY.
 *
 * EmpireVu re-prices this against the tenant's own catalog to auto-generate a
 * quote. It cannot use `lineItems`: those carry priced customer-facing
 * DESCRIPTIONS, and matching them back to services would mean string-matching
 * prose. Keys survive a label change; prose does not.
 */
export interface LeadSelection {
  bundleKey?: string;
  /** Hull type — selects a variant surcharge. */
  variant?: string;
  services?: Array<{ serviceKey: string; measure?: number; quantity?: number }>;
}

export function buildStorageQuoteEnvelope(input: {
  id: string;
  receivedAt: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    boatMakeModelYear?: string;
    marina?: string;
  };
  quote: {
    hullType?: string | null;
    subtotalCents: number;
    bundle?: { label: string } | null;
    lineItems: Array<{
      detail: {
        lengthFt?: number | null;
        type?: string;
        engineType?: string | null;
        engineCount?: number | null;
      };
    }>;
  };
  jobberLineItems: LeadLineItem[];
  utm?: Record<string, string>;
  logistics?: LeadLogistics;
  selection?: LeadSelection;
  /** Short human reference (A1MS-Q-XXXXXX) when the quote came from a PDF download. */
  quoteRef?: string;
  /** Capture route when it was not the ordinary calculator submission, e.g. `pdf_download`. */
  source?: string;
}): LeadEnvelope {
  const c = input.contact;
  const q = input.quote;
  const lengthFt =
    q.lineItems.find(l => l.detail.lengthFt != null)?.detail.lengthFt ??
    undefined;

  /**
   * The engine, taken from the priced winterization line.
   *
   * REQUIRED FOR AUTO-QUOTING. EmpireVu refuses to auto-quote a lead that asks
   * for winterization without a known engine type — "not sure" is a real answer
   * on the form and must not be guessed. This envelope omitted it entirely, so
   * every storage quote arrived as engine "none" and was declined, even though
   * the site had the answer and was already logging it to analytics.
   *
   * Read from the QUOTE rather than the form so it cannot disagree with what was
   * actually priced: flat_per_engine is the shape winterization takes, and its
   * detail carries the type and count the engine used.
   */
  const engineLine = q.lineItems.find(l => l.detail.type === "flat_per_engine");
  const engineType = engineLine?.detail.engineType ?? undefined;
  const engineCount = engineLine?.detail.engineCount ?? undefined;
  const summary = joinText(
    q.bundle ? `Package: ${q.bundle.label}` : "À la carte",
    `Subtotal (pre-HST): $${(q.subtotalCents / 100).toFixed(2)}`
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
    // engineType/engineCount drop out via compact() for a quote with no
    // winterization line, so a storage-only quote serialises exactly as before.
    asset: compact({
      makeModel: c.boatMakeModelYear,
      type: q.hullType ?? undefined,
      marina: c.marina,
      lengthFt,
      engineType,
      engineCount,
    }),
    // logistics/quoteRef dropped by compact() when absent → unchanged output for
    // quotes without them (golden-safe, same trick as the contact envelope's utm).
    meta: compact({
      site: "a1marinestorage.ca",
      page: "/calculator",
      utm: input.utm,
      logistics: compactLogistics(input.logistics),
      selection: input.selection
        ? compact(input.selection as Record<string, unknown>)
        : undefined,
      quoteRef: input.quoteRef,
      // How the lead was captured, when it was not the ordinary calculator
      // submission. Compacted away when unset, so a normal quote's envelope is
      // byte-identical to what it has always been.
      source: input.source,
    }) ?? { site: "a1marinestorage.ca" },
  };
}

// ── Forwarder (best-effort, HMAC-signed) ─────────────────────────────────────

export function signEmpireVuBody(rawBody: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Read a response only if it is recognisably the intake's.
 *
 * `leadId` is the proof: the intake always returns one, and nothing else does.
 * Returns null for HTML, empty bodies, unparseable JSON, or a body reader that
 * does not exist — all of which mean "something answered, but not the intake".
 *
 * Deliberately total: it never throws, because a throw here would land in the
 * retry loop and re-post the SAME lead.
 */
async function readIntakeBody(
  res: Response
): Promise<{ leadId: string; quoteUrl?: string } | null> {
  try {
    const body = (await res.json()) as {
      ok?: unknown;
      leadId?: unknown;
      quoteUrl?: unknown;
    } | null;
    if (!body || typeof body.leadId !== "string" || !body.leadId) return null;
    const quoteUrl =
      typeof body.quoteUrl === "string" && body.quoteUrl
        ? body.quoteUrl
        : undefined;
    return quoteUrl
      ? { leadId: body.leadId, quoteUrl }
      : { leadId: body.leadId };
  } catch {
    return null;
  }
}

/**
 * What the intake told us. `quoteUrl` is present only when EmpireVu auto-quoted
 * the lead — a minority of them — and is what lets the confirmation screen offer
 * a deposit instead of promising an email.
 */
export interface EmpireVuForwardResult {
  ok: boolean;
  quoteUrl?: string;
  /**
   * EmpireVu's id for the lead. Already parsed as the proof this response came
   * from the real intake; surfaced so the caller can store it against the quote
   * row and the two systems can be reconciled later.
   */
  leadId?: string;
}

/**
 * Fan out an envelope to EmpireVu's /api/intake. Never throws. Skips cleanly if
 * unconfigured or disabled — the legacy hub + durable log remain the source of truth.
 *
 * Returns the intake's answer so the caller can offer a deposit link. That does
 * NOT make this call load-bearing: every failure path still returns `ok: false`
 * and the lead is already durably recorded before this runs.
 */
export async function forwardToEmpireVu(
  envelope: LeadEnvelope,
  attempts = 3
): Promise<EmpireVuForwardResult> {
  if (process.env.EMPIREVU_INTAKE_DISABLED === "1") return { ok: false };
  const url = process.env.EMPIREVU_INTAKE_URL;
  const secret = process.env.EMPIREVU_INTAKE_SECRET;
  if (!url || !secret) {
    console.log(
      "[empirevu] EMPIREVU_INTAKE_URL/SECRET not set — skipping (legacy hub + durable log unaffected)"
    );
    return { ok: false };
  }
  const rawBody = JSON.stringify(envelope);
  const headers = {
    "Content-Type": "application/json",
    "x-empirevu-signature": signEmpireVuBody(rawBody, secret),
  };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: rawBody });
      if (res.ok) {
        // A 200 IS NOT PROOF THE LEAD LANDED.
        //
        // empirevu.com serves a marketing SPA whose catch-all answers ANY
        // unmatched path with 200 and index.html. Pointed there, this forwarder
        // posted every lead, read "ok", logged success — and the lead was gone.
        // Silently, indefinitely, with a green log line. The real intake replies
        // with JSON: {ok:true, leadId}. Requiring that is the difference between
        // a misrouted URL being loud and being invisible.
        const body = await readIntakeBody(res);
        if (!body) {
          console.error(
            `[empirevu] ${res.status} from ${url} but the body is not an intake response — ` +
              `the URL is probably wrong (a marketing site or proxy answering 200). Lead NOT confirmed.`
          );
          // Falls through to the retry loop, then to the loud give-up below.
        } else {
          console.log(
            `[empirevu] forwarded ${envelope.formType} (attempt ${attempt}, lead ${body.leadId})`
          );
          return body.quoteUrl
            ? { ok: true, quoteUrl: body.quoteUrl, leadId: body.leadId }
            : { ok: true, leadId: body.leadId };
        }
      } else {
        console.error(
          `[empirevu] responded ${res.status} (attempt ${attempt})`
        );
      }
    } catch (err) {
      console.error(
        `[empirevu] forward failed (attempt ${attempt}):`,
        err instanceof Error ? err.message : String(err)
      );
    }
    if (attempt < attempts) await sleep(attempt * 750);
  }
  console.error(
    `[empirevu] gave up after ${attempts} attempts — legacy hub + durable log still hold the lead`
  );
  return { ok: false };
}
