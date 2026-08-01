// A1 Marine Storage — Storage Quote Calculator
// Bundles-first quote & booking flow, powered by the shared @a1/pricing-engine.
// Style: Contemporary Coastal Modernism — dark harbor, cyan accents, sticky price panel.
import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Snowflake, Shield, Wrench, Sun, Sparkles,
  Anchor, User, Send, Info, ChevronDown, ChevronUp, Phone, Mail, Ship, AlertTriangle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS } from "@/content/business";
import { track, trackPhoneClick } from "@/lib/analytics";
import {
  calculateQuote,
  formatCents,
  STORAGE,
  type EngineType,
  type QuoteInput,
  type QuoteResult,
  type StoragePerFootService,
} from "@a1/pricing-engine";
import {
  buildStorageQuoteInput,
  bundleServiceIds,
  itemForService,
  winterizationId,
  CERAMIC_MAX_FT,
  type BoatState,
} from "@/lib/quote-items";

// ── Static presentation data ─────────────────────────────────────────────────

const HULL_TYPES: { value: string; label: string; surcharge?: boolean }[] = [
  { value: "bowrider", label: "Bowrider / Runabout" },
  { value: "cruiser", label: "Cruiser / Cabin" },
  { value: "pontoon", label: "Pontoon", surcharge: true },
  { value: "tritoon", label: "Tritoon", surcharge: true },
  { value: "pwc", label: "PWC / Jet Ski" },
  { value: "sailboat", label: "Sailboat" },
  { value: "other", label: "Other" },
];

const ENGINE_TYPES: { value: EngineType; label: string }[] = [
  { value: "outboard", label: "Outboard" },
  { value: "sterndrive", label: "Sterndrive (I/O)" },
  { value: "inboard", label: "Inboard" },
];

const BUNDLE_META: Record<string, { icon: typeof Snowflake; tagline: string; badge?: string; highlight?: boolean }> = {
  winter_ready: {
    icon: Shield,
    tagline: "Secure outdoor storage + professional shrink wrapping. For owners who winterize themselves.",
  },
  winter_ready_plus: {
    icon: Snowflake,
    tagline: "Everything in Winter Ready, plus full engine winterization. Our most popular package.",
    badge: "Most Popular",
    highlight: true,
  },
  full_care: {
    icon: Sparkles,
    tagline: "The complete hands-off winter: storage, wrap, winterization, fall detail & spring commissioning.",
    badge: "Best Value",
  },
};

const BUNDLE_ORDER = ["winter_ready", "winter_ready_plus", "full_care"];

const ALACARTE_META: Record<string, { icon: typeof Snowflake; blurb: string }> = {
  outdoor_storage: { icon: Shield, blurb: "Secured, fenced outdoor lot for the season." },
  shrink_wrap: { icon: Snowflake, blurb: "Commercial-grade heat-shrink film with vents." },
  winterization: { icon: Wrench, blurb: "Engine flush, fogging, antifreeze & stabilizer." },
  fall_detail: { icon: Sun, blurb: "Full wash & wax before wrapping." },
  spring_commissioning: { icon: Anchor, blurb: "De-winterize & launch-ready in spring." },
};

// ceramic_upgrade is a per_foot service; narrow it since the v1.2.0 StorageService
// union now also includes shapes (tiered_by_length) that have no flat rateCents.
const ceramicService = STORAGE.services.ceramic_upgrade as StoragePerFootService;

type Mode = "bundle" | "alacarte";
type SubmitStatus = "idle" | "submitting" | "success" | "fallback";

// ── Engine input helpers ─────────────────────────────────────────────────────

function safeQuote(input: QuoteInput): QuoteResult | null {
  try {
    return calculateQuote(input);
  } catch {
    return null;
  }
}

const money = (cents: number) => formatCents(cents);

// ── Component ────────────────────────────────────────────────────────────────

export default function Calculator() {
  const [step, setStep] = useState(1);

  const [lengthInput, setLengthInput] = useState("");
  const [hullType, setHullType] = useState("");
  const [engineType, setEngineType] = useState<EngineType>("outboard");
  const [engineCount, setEngineCount] = useState(1);

  const [mode, setMode] = useState<Mode | null>(null);
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [alacarte, setAlacarte] = useState<Set<string>>(new Set());
  const [ceramicUpgrade, setCeramicUpgrade] = useState(false);

  const [contact, setContact] = useState({ name: "", email: "", phone: "", boatMakeModelYear: "", marina: "" });

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(true);

  // Funnel top: fire quote_started once, on the first calculator field change.
  const startedRef = useRef(false);
  function markStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    track("quote_started");
  }

  const lengthFt = Number.parseFloat(lengthInput);
  const lengthValid = Number.isFinite(lengthFt) && lengthFt > 0;
  const boat: BoatState = { lengthFt: lengthValid ? lengthFt : 0, hullType, engineType, engineCount };
  const ceramicEligible = lengthValid && lengthFt <= CERAMIC_MAX_FT;

  // Live price for each of the three bundles (no ceramic — that's a post-selection upsell).
  const bundleQuotes = useMemo(() => {
    const out: Record<string, QuoteResult | null> = {};
    if (!lengthValid) return out;
    for (const id of BUNDLE_ORDER) {
      const items = bundleServiceIds(id, boat).map((sid) => itemForService(sid, boat));
      out[id] = safeQuote({ serviceLine: "storage", items, hullType: hullType || undefined, bundleId: id });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lengthValid, lengthFt, hullType, engineType, engineCount]);

  // The QuoteInput for the customer's current selection (incl. ceramic upsell).
  const selectedInput = useMemo<QuoteInput | null>(
    () => buildStorageQuoteInput({ mode, bundleId, alacarteIds: Array.from(alacarte), ceramicUpgrade }, boat),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lengthValid, lengthFt, hullType, engineType, engineCount, mode, bundleId, alacarte, ceramicUpgrade],
  );

  const quote = useMemo(() => (selectedInput ? safeQuote(selectedInput) : null), [selectedInput]);

  const canProceedStep1 = lengthValid && hullType !== "";
  const hasSelection = quote != null && quote.lineItems.length > 0;
  const canSubmit =
    hasSelection && contact.name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) &&
    contact.phone.replace(/\D/g, "").length >= 7;

  function toggleAlacarte(id: string) {
    setMode("alacarte");
    setBundleId(null);
    setAlacarte((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        // Indoor/outdoor are the same slot here (only outdoor exists); nothing mutually exclusive.
        next.add(id);
      }
      return next;
    });
  }

  function selectBundle(id: string) {
    setMode("bundle");
    setBundleId(id);
    setAlacarte(new Set());
  }

  async function submit() {
    if (!selectedInput) return;
    setStatus("submitting");
    setErrorMsg("");
    const payload = {
      quoteInput: selectedInput,
      contact,
      meta: { mode, bundleId, ceramicUpgrade, boat, lengthFt },
    };
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          if (quote) {
            // Conversion event — engine-derived totals only, no personal data.
            track("quote_completed", {
              quote_total: Math.round(quote.subtotalCents) / 100,
              services: quote.lineItems.map((l) => l.serviceId).join(","),
              boat_length: lengthFt,
            });
          }
          setStatus("success");
          return;
        }
        if (res.status >= 400 && res.status < 500) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setErrorMsg(data.error ?? "Please check your details and try again.");
          setStatus("idle");
          return;
        }
        // 5xx — fall through to retry
      } catch {
        // network error — fall through to retry
      }
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, attempt * 800));
    }
    // Retries exhausted — graceful fallback, never a fake success.
    setStatus("fallback");
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (status === "success" && quote) {
    return (
      <div className="min-h-screen bg-[oklch(0.12_0.018_240)] pt-24 pb-20">
        <div className="container max-w-xl mx-auto text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[oklch(0.85_0.18_195)/10] mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-[oklch(0.85_0.18_195)]" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Quote Request Received!
          </h1>
          <p className="text-base text-white/65 mb-6">
            Thanks, <strong className="text-white">{contact.name}</strong>! We've saved your storage quote and will
            reach out within 1–2 business days to confirm your booking and reserve your spot.
          </p>
          <div className="marine-card p-5 mb-6 text-left">
            <p className="text-sm font-semibold text-white mb-3">Your Estimate</p>
            {quote.lineItems.map((l) => (
              <div key={l.serviceId} className="flex justify-between gap-4 text-sm text-white/65 py-1 border-b border-white/5">
                <span>{l.label}</span>
                <span className="tabular-nums">{money(l.amountCents)}</span>
              </div>
            ))}
            {quote.bundleSavingsCents > 0 && (
              <div className="flex justify-between text-sm text-[oklch(0.85_0.18_195)] py-1">
                <span>Bundle savings</span>
                <span className="tabular-nums">−{money(quote.bundleSavingsCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
              <span>Subtotal</span>
              <span className="tabular-nums text-[oklch(0.85_0.18_195)]">{money(quote.subtotalCents)}</span>
            </div>
            <p className="text-xs text-white/40 mt-2">Plus HST. Full payment due at booking to reserve your spot.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)]">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main flow ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Header */}
      <section className="pt-24 pb-8 bg-black border-b border-white/10">
        <div className="container max-w-7xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.18_195)] mb-2">
            Instant Estimate · Transparent Per-Foot Pricing
          </p>
          <h1 className="text-4xl font-black text-white md:text-5xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Storage Quote Calculator
          </h1>
          <p className="mt-2 text-base text-white/55 max-w-2xl">
            Enter your boat, pick a winter package, and see your price instantly — right down to the per-foot rate.
          </p>
        </div>
      </section>

      {/* Stepper */}
      <div className="bg-black border-b border-white/10 sticky top-16 z-40">
        <div className="container max-w-7xl mx-auto py-3">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
            {[
              { id: 1, label: "Boat Details", icon: Ship },
              { id: 2, label: "Choose Package", icon: Snowflake },
              { id: 3, label: "Your Details", icon: User },
            ].map((s, i) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-all ${
                      active
                        ? "bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)]"
                        : done
                        ? "bg-[oklch(0.85_0.18_195)/15] text-[oklch(0.85_0.18_195)]"
                        : "bg-white/5 text-white/40"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    {s.label}
                  </div>
                  {i < 2 && <div className={`h-px w-6 ${step > s.id ? "bg-[oklch(0.85_0.18_195)/40]" : "bg-white/10"}`} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* ── Main column ── */}
          <div>
            {/* STEP 1 — Boat Details */}
            {step === 1 && (
              <div className="marine-card p-6 md:p-8">
                <h2 className="text-2xl font-black text-white mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Step 1 — Your Boat
                </h2>
                <div className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-semibold text-white/80 mb-2 block">
                        Boat Length (ft) <span className="text-[oklch(0.85_0.18_195)]">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="8"
                        max="80"
                        inputMode="decimal"
                        placeholder="e.g. 24"
                        value={lengthInput}
                        onChange={(e) => {
                          markStarted();
                          setLengthInput(e.target.value);
                        }}
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                      />
                      <p className="text-xs text-white/40 mt-1.5">Length overall (LOA) in feet.</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-white/80 mb-2 block">
                        Hull Type <span className="text-[oklch(0.85_0.18_195)]">*</span>
                      </Label>
                      <Select value={hullType} onValueChange={setHullType}>
                        <SelectTrigger className="bg-white/5 border-white/15 text-white h-12 focus:border-[oklch(0.85_0.18_195)]">
                          <SelectValue placeholder="Select hull type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[oklch(0.16_0.018_240)] border-white/15">
                          {HULL_TYPES.map((h) => (
                            <SelectItem key={h.value} value={h.value} className="text-white focus:bg-white/10">
                              {h.label}
                              {h.surcharge ? " (multi-hull surcharge)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {HULL_TYPES.find((h) => h.value === hullType)?.surcharge && (
                        <p className="text-xs text-[oklch(0.85_0.18_195)]/80 mt-1.5">
                          Pontoons & tritoons carry a per-foot surcharge on storage & wrapping (wider footprint).
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-semibold text-white/80 mb-2 block">Engine Type</Label>
                      <Select value={engineType} onValueChange={(v) => setEngineType(v as EngineType)}>
                        <SelectTrigger className="bg-white/5 border-white/15 text-white h-12 focus:border-[oklch(0.85_0.18_195)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[oklch(0.16_0.018_240)] border-white/15">
                          {ENGINE_TYPES.map((e) => (
                            <SelectItem key={e.value} value={e.value} className="text-white focus:bg-white/10">
                              {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-white/40 mt-1.5">Used to price winterization.</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-white/80 mb-2 block">Number of Engines</Label>
                      <div className="flex items-center gap-3 h-12">
                        <button
                          type="button"
                          onClick={() => setEngineCount((c) => Math.max(1, c - 1))}
                          className="h-10 w-10 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 text-lg font-bold"
                        >
                          −
                        </button>
                        <span className="text-lg font-bold text-white w-8 text-center tabular-nums">{engineCount}</span>
                        <button
                          type="button"
                          onClick={() => setEngineCount((c) => Math.min(6, c + 1))}
                          className="h-10 w-10 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 text-lg font-bold"
                        >
                          +
                        </button>
                        <span className="text-xs text-white/40 ml-1">Additional engines billed at 75%.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] disabled:opacity-40 btn-cyan-glow"
                  >
                    Next: Choose Package <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2 — Choose Package */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Step 2 — Choose Your Package
                  </h2>
                  <p className="text-sm text-white/50">
                    {lengthFt} ft {HULL_TYPES.find((h) => h.value === hullType)?.label} · prices below are for your boat.
                  </p>
                </div>

                {/* Bundle cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  {BUNDLE_ORDER.map((id) => {
                    const b = STORAGE.bundles[id];
                    const meta = BUNDLE_META[id];
                    const q = bundleQuotes[id];
                    const Icon = meta.icon;
                    const selected = mode === "bundle" && bundleId === id;
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => selectBundle(id)}
                        className={`marine-card relative p-5 text-left flex flex-col transition-all ${
                          selected
                            ? "ring-2 ring-[oklch(0.85_0.18_195)] border-[oklch(0.85_0.18_195)/40]"
                            : "hover:border-white/25"
                        } ${meta.highlight ? "md:-mt-2" : ""}`}
                      >
                        {meta.badge && (
                          <span className="absolute -top-2.5 left-4 rounded-full bg-[oklch(0.85_0.18_195)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[oklch(0.12_0.018_240)]">
                            {meta.badge}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-5 w-5 text-[oklch(0.85_0.18_195)]" />
                          <h3 className="text-lg font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                            {b.label}
                          </h3>
                        </div>
                        <p className="text-xs text-white/55 leading-relaxed mb-4 min-h-[48px]">{meta.tagline}</p>
                        <div className="mt-auto">
                          {q ? (
                            <>
                              <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-white tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                  {money(q.subtotalCents)}
                                </span>
                                <span className="text-xs text-white/40 line-through mb-1 tabular-nums">{money(q.aLaCarteSubtotalCents)}</span>
                              </div>
                              <p className="text-xs font-semibold text-[oklch(0.85_0.18_195)] mt-0.5">
                                Save {money(q.bundleSavingsCents)} ({b.discountPct}% bundle)
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-white/40">Enter boat details</span>
                          )}
                          <div className={`mt-3 h-9 rounded-lg flex items-center justify-center text-sm font-semibold ${
                            selected ? "bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)]" : "border border-white/15 text-white/80"
                          }`}>
                            {selected ? "Selected" : "Select"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Ceramic upsell (post-selection, only ≤ max ft) */}
                {mode && ceramicEligible && (
                  <button
                    type="button"
                    onClick={() => setCeramicUpgrade((v) => !v)}
                    className={`marine-card w-full p-4 flex items-center gap-4 text-left transition-all ${
                      ceramicUpgrade ? "ring-2 ring-[oklch(0.85_0.18_195)]" : "hover:border-white/25"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.85_0.18_195)/12]">
                      <Sparkles className="h-5 w-5 text-[oklch(0.85_0.18_195)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Add a Winter Ceramic Coating</p>
                      <p className="text-xs text-white/50">
                        Lock in gloss & protection over winter — {money(ceramicService.rateCents)}/ft
                        {" "}(≤ {CERAMIC_MAX_FT} ft). Not discounted in bundles.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[oklch(0.85_0.18_195)] tabular-nums">
                        +{money(Math.round(ceramicService.rateCents * lengthFt))}
                      </p>
                      <div className={`mt-1 h-5 w-5 ml-auto rounded-full border-2 flex items-center justify-center ${
                        ceramicUpgrade ? "border-[oklch(0.85_0.18_195)] bg-[oklch(0.85_0.18_195)]" : "border-white/20"
                      }`}>
                        {ceramicUpgrade && <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.12_0.018_240)]" />}
                      </div>
                    </div>
                  </button>
                )}

                {/* À la carte */}
                <details className="marine-card p-5 group" open={mode === "alacarte"}>
                  <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-white">
                    <span>Prefer to pick individual services?</span>
                    <ChevronDown className="h-4 w-4 text-white/40 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-4 space-y-2">
                    {["outdoor_storage", "shrink_wrap", "winterization", "fall_detail", "spring_commissioning"].map((id) => {
                      const isWinter = id === "winterization";
                      const svcId = isWinter ? winterizationId(engineType) : id;
                      const svc = STORAGE.services[svcId];
                      const meta = ALACARTE_META[id];
                      const Icon = meta.icon;
                      const selected = alacarte.has(id);
                      const preview = safeQuote({
                        serviceLine: "storage",
                        items: [itemForService(svcId, boat)],
                        hullType: hullType || undefined,
                      });
                      const rateLabel =
                        svc.type === "per_foot"
                          ? `${money(svc.rateCents)}/ft${svc.minimumCents ? ` · min ${money(svc.minimumCents)}` : ""}`
                          : svc.type === "flat_per_engine"
                          ? `${money(svc.rateCents)}/engine`
                          : "flat rate";
                      return (
                        <div
                          key={id}
                          onClick={() => toggleAlacarte(id)}
                          className={`flex items-center gap-4 rounded-xl border p-3 cursor-pointer transition-all ${
                            selected ? "border-[oklch(0.85_0.18_195)/50] bg-[oklch(0.85_0.18_195)/8]" : "border-white/10 hover:border-white/20"
                          }`}
                        >
                          <Icon className={`h-5 w-5 shrink-0 ${selected ? "text-[oklch(0.85_0.18_195)]" : "text-white/40"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{isWinter ? `Winterization (${engineType})` : svc.label}</p>
                            <p className="text-xs text-white/45">{meta.blurb} · {rateLabel}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-[oklch(0.85_0.18_195)] tabular-nums">
                              {preview ? money(preview.subtotalCents) : "—"}
                            </p>
                          </div>
                          <div className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center ${
                            selected ? "border-[oklch(0.85_0.18_195)] bg-[oklch(0.85_0.18_195)]" : "border-white/20"
                          }`}>
                            {selected && <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.12_0.018_240)]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>

                <div className="flex justify-between">
                  <Button onClick={() => setStep(1)} variant="outline" className="border-white/20 text-white/70 hover:border-white/40 hover:text-white">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!hasSelection}
                    className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] disabled:opacity-40 btn-cyan-glow"
                  >
                    Next: Your Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3 — Your Details */}
            {step === 3 && (
              <div className="marine-card p-6 md:p-8">
                <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Step 3 — Your Details
                </h2>
                <p className="text-sm text-white/50 mb-6">This is a quote request, not a payment. We'll confirm your booking.</p>

                {status === "fallback" && (
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-100/90">
                      <p className="font-semibold text-yellow-200">We couldn't submit your request just now.</p>
                      <p className="mt-1">Please call or email us and we'll lock in your quote right away:</p>
                      <div className="mt-2 flex flex-col gap-1">
                        <a href={BUSINESS.phoneHref} onClick={() => trackPhoneClick("calculator")} className="inline-flex items-center gap-2 font-semibold text-white hover:text-[oklch(0.85_0.18_195)]">
                          <Phone className="h-4 w-4" /> {BUSINESS.phone}
                        </a>
                        <a href={BUSINESS.emailHref} className="inline-flex items-center gap-2 font-semibold text-white hover:text-[oklch(0.85_0.18_195)]">
                          <Mail className="h-4 w-4" /> {BUSINESS.email}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {errorMsg && status === "idle" && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 mb-6">{errorMsg}</div>
                )}

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full Name" required value={contact.name} onChange={(v) => setContact({ ...contact, name: v })} placeholder="John Smith" />
                    <Field label="Email" required type="email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} placeholder="john@example.com" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone" required type="tel" value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} placeholder="(705) 555-1234" />
                    <Field label="Boat Make / Model / Year" value={contact.boatMakeModelYear} onChange={(v) => setContact({ ...contact, boatMakeModelYear: v })} placeholder="e.g. 2018 Chaparral 23 H2O" />
                  </div>
                  <Field label="Current Marina / Location" value={contact.marina} onChange={(v) => setContact({ ...contact, marina: v })} placeholder="e.g. Bay Port Yachting Centre, Midland" />
                </div>

                <div className="mt-8 flex justify-between">
                  <Button onClick={() => setStep(2)} variant="outline" className="border-white/20 text-white/70 hover:border-white/40 hover:text-white">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={submit}
                    disabled={!canSubmit || status === "submitting"}
                    className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] disabled:opacity-40 btn-cyan-glow"
                  >
                    {status === "submitting" ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Submit Quote Request</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky price panel ── */}
          <div className="lg:sticky lg:top-40 lg:self-start">
            <div className="marine-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white">Your Quote</p>
                {quote && (
                  <button onClick={() => setShowBreakdown((v) => !v)} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1">
                    {showBreakdown ? "Hide" : "Show"} breakdown
                    {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {!quote ? (
                <p className="text-sm text-white/40 py-6 text-center">
                  {lengthValid ? "Choose a package to see your quote." : "Enter your boat length to begin."}
                </p>
              ) : (
                <>
                  {showBreakdown && (
                    <div className="space-y-2 mb-3 pb-3 border-b border-white/10">
                      {quote.lineItems.map((l) => (
                        <div key={l.serviceId} className="flex justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="text-white/80 truncate">{l.label}</p>
                            <p className="text-white/40">{lineDetail(l)}</p>
                          </div>
                          <span className="text-white/80 font-medium tabular-nums shrink-0">{money(l.amountCents)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {quote.bundle && (
                    <div className="space-y-1 mb-3 text-xs">
                      <div className="flex justify-between text-white/50">
                        <span>À-la-carte</span>
                        <span className="line-through tabular-nums">{money(quote.aLaCarteSubtotalCents)}</span>
                      </div>
                      <div className="flex justify-between text-[oklch(0.85_0.18_195)] font-semibold">
                        <span>{quote.bundle.label} savings ({quote.bundle.discountPct}%)</span>
                        <span className="tabular-nums">−{money(quote.bundleSavingsCents)}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-center py-2">
                    <p className="text-3xl font-black text-[oklch(0.85_0.18_195)] tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {money(quote.subtotalCents)}
                    </p>
                    <p className="text-xs text-white/40 mt-1">Plus HST. Full payment due at booking to reserve your spot.</p>
                  </div>

                  {step < 3 && (
                    <Button
                      onClick={() => setStep(step === 1 ? 2 : 3)}
                      className="w-full mt-3 bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] btn-cyan-glow"
                    >
                      {step === 1 ? "Choose Package" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </>
              )}

              <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-white/30 mt-0.5 shrink-0" />
                <p className="text-xs text-white/35 leading-relaxed">
                  Estimate based on length overall. Final pricing confirmed after an on-site check. Prices in CAD.
                </p>
              </div>
            </div>

            <div className="marine-card p-4 mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-2">Questions?</p>
              <a href={BUSINESS.phoneHref} onClick={() => trackPhoneClick("calculator")} className="flex items-center gap-2 text-sm text-white/70 hover:text-[oklch(0.85_0.18_195)]">
                <Phone className="h-4 w-4" /> {BUSINESS.phone}
              </a>
              <a href={BUSINESS.emailHref} className="flex items-center gap-2 text-sm text-white/70 hover:text-[oklch(0.85_0.18_195)] mt-1">
                <Mail className="h-4 w-4" /> {BUSINESS.email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function lineDetail(l: QuoteResult["lineItems"][number]): string {
  const d = l.detail;
  if (d.type === "per_foot") {
    if (d.minimumApplied) return `${d.lengthFt} ft · minimum`;
    let s = `${d.lengthFt} ft × ${formatCents(d.rateCents ?? 0)}/ft`;
    if ((d.hullSurchargeCents ?? 0) > 0) s += ` +${formatCents(d.hullSurchargePerFootCents ?? 0)}/ft hull`;
    return s;
  }
  if (d.type === "flat_per_engine") {
    return d.engineCount && d.engineCount > 1 ? `${d.engineCount} engines` : "1 engine";
  }
  return "flat rate";
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label className="text-sm font-semibold text-white/80 mb-2 block">
        {props.label} {props.required && <span className="text-[oklch(0.85_0.18_195)]">*</span>}
      </Label>
      <Input
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
      />
    </div>
  );
}
