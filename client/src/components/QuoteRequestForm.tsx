// Reusable lead-capture form used by the /winter-quote ad landing page and
// (Phase 2) the locality pages. POSTs to the existing /api/contact pipeline —
// durable-write-first, EmpireVu dual-send — and attaches UTM attribution +
// the landing page path so campaign leads are traceable end-to-end.
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics";
import { getUtm } from "@/lib/utm";

const SERVICE_OPTIONS = ["Outdoor Storage", "Shrink Wrapping", "Winterization", "Spring Commissioning"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface QuoteRequestFormProps {
  /** Landing path recorded on the lead for attribution, e.g. "/winter-quote". */
  page: string;
  /** Optional context prefixed to the service interest, e.g. "Winter storage — Midland". */
  serviceContext?: string;
  submitLabel?: string;
}

export function QuoteRequestForm({ page, serviceContext, submitLabel = "Request My Quote" }: QuoteRequestFormProps) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", boatLength: "", boatType: "", message: "" });
  const [services, setServices] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const bind = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleService = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const emailOk = EMAIL_RE.test(form.email.trim());
  const canSubmit =
    form.name.trim().length >= 2 && emailOk && form.phone.replace(/\D/g, "").length >= 7 && status !== "submitting";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    setError("");
    const serviceInterest = [serviceContext, services.join(", ")].filter(Boolean).join(" — ");
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      boatMakeModel: form.boatType || undefined,
      boatLength: form.boatLength || undefined,
      serviceInterest: serviceInterest || undefined,
      message: form.message || undefined,
      utm: getUtm(),
      page,
    };
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = (await res.json().catch(() => ({ ok: true }))) as { ok?: boolean };
          if (data.ok) {
            track("request_form_submit", {
              service: serviceInterest || undefined,
              boat_length: Number(form.boatLength) || undefined,
            });
            setDone(true);
            return;
          }
        } else if (res.status >= 400 && res.status < 500) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Please check your details and try again.");
          setStatus("error");
          return;
        }
      } catch {
        /* network — retry */
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 600));
    }
    setError("We couldn't submit that just now. Please call us or try again.");
    setStatus("error");
  }

  if (done) {
    return (
      <div className="marine-card p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[oklch(0.6_0.2_27)/10] mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-[oklch(0.6_0.2_27)]" />
        </div>
        <h3 className="text-2xl font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Request received!
        </h3>
        <p className="mt-2 text-base text-white/65">
          Thanks — we'll be in touch within 1–2 business days with your quote and availability.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="marine-card p-6 md:p-8 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="qf-name" className="text-white/70">Name *</Label>
          <Input id="qf-name" value={form.name} onChange={bind("name")} required className="mt-1.5" placeholder="Your name" />
        </div>
        <div>
          <Label htmlFor="qf-phone" className="text-white/70">Phone *</Label>
          <Input id="qf-phone" type="tel" value={form.phone} onChange={bind("phone")} required className="mt-1.5" placeholder="(249) 000-0000" />
        </div>
      </div>
      <div>
        <Label htmlFor="qf-email" className="text-white/70">Email *</Label>
        <Input id="qf-email" type="email" value={form.email} onChange={bind("email")} required className="mt-1.5" placeholder="you@email.com" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="qf-length" className="text-white/70">Boat length (ft)</Label>
          <Input id="qf-length" inputMode="numeric" value={form.boatLength} onChange={bind("boatLength")} className="mt-1.5" placeholder="e.g. 24" />
        </div>
        <div>
          <Label htmlFor="qf-type" className="text-white/70">Boat make / model</Label>
          <Input id="qf-type" value={form.boatType} onChange={bind("boatType")} className="mt-1.5" placeholder="e.g. Sea Ray 240" />
        </div>
      </div>
      <div>
        <Label className="text-white/70">Services you're interested in</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {SERVICE_OPTIONS.map((s) => {
            const on = services.includes(s);
            return (
              <button
                type="button"
                key={s}
                onClick={() => toggleService(s)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  on
                    ? "border-[oklch(0.6_0.2_27)] bg-[oklch(0.6_0.2_27)/15] text-white"
                    : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label htmlFor="qf-msg" className="text-white/70">Anything else? (optional)</Label>
        <Textarea id="qf-msg" value={form.message} onChange={bind("message")} className="mt-1.5" rows={3} placeholder="Drop-off timing, twin engines, trailer storage…" />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        type="submit"
        disabled={!canSubmit}
        size="lg"
        className="w-full h-14 text-base font-semibold bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow disabled:opacity-50"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending…
          </>
        ) : (
          submitLabel
        )}
      </Button>
      <p className="text-center text-xs text-white/40">No obligation. We respond within 1–2 business days.</p>
    </form>
  );
}
