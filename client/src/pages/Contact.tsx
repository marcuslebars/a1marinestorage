// A1 Marine Storage — Contact Page
// SEO: "contact boat storage Tiny Ontario", "A1 Marine Storage phone"
import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapView } from "@/components/Map";
import { BUSINESS } from "@/content/business";

interface FormData {
  name: string;
  email: string;
  phone: string;
  boatMakeModel: string;
  boatLength: string;
  serviceInterest: string;
  message: string;
}

export default function Contact() {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    boatMakeModel: "",
    boatLength: "",
    serviceInterest: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitFallback, setSubmitFallback] = useState(false);

  const canSubmit = form.name && form.email && form.phone;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitFallback(false);

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      boatMakeModel: form.boatMakeModel,
      boatLength: form.boatLength,
      serviceInterest: form.serviceInterest,
      message: form.message,
    };

    const maxAttempts = 3;
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({ ok: true }));
            if (data.ok) {
              setSubmitted(true);
              return;
            }
          } else if (res.status >= 400 && res.status < 500) {
            const data = await res.json().catch(() => ({}));
            setSubmitError(data.error || "Please check your details and try again.");
            return;
          }
          // 5xx — fall through to retry.
        } catch {
          // Network error — fall through to retry.
        }
        if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      }
      // Every attempt failed — never a fake success.
      setSubmitFallback(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[oklch(0.12_0.018_240)] flex items-center justify-center pt-20">
        <div className="container max-w-xl mx-auto text-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[oklch(0.85_0.18_195)/10] mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-[oklch(0.85_0.18_195)]" />
          </div>
          <h1
            className="text-4xl font-black text-white mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Message Sent!
          </h1>
          <p className="text-base text-white/65 mb-8">
            Thanks, <strong className="text-white">{form.name}</strong>! We've received your message and will be in touch within 1–2 business days.
          </p>
          <Button
            onClick={() => setSubmitted(false)}
            className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)]"
          >
            Send Another Message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Page Hero */}
      <section className="relative pt-32 pb-12 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-7xl mx-auto relative z-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.18_195)] mb-4">
            Get in Touch
          </p>
          <h1
            className="text-5xl font-black text-white md:text-7xl"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Contact A1 Marine Storage
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-base text-white/60">
            Questions about storage availability, pricing, or booking? We're here to help.
          </p>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="section-space">
        <div className="container max-w-7xl mx-auto">
          <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
            {/* Contact Form */}
            <div className="marine-card p-6 md:p-8">
              <h2
                className="text-2xl font-black text-white mb-6"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Send Us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-semibold text-white/80 mb-2 block">
                      Full Name <span className="text-[oklch(0.85_0.18_195)]">*</span>
                    </Label>
                    <Input
                      placeholder="John Smith"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-white/80 mb-2 block">
                      Email <span className="text-[oklch(0.85_0.18_195)]">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-semibold text-white/80 mb-2 block">
                      Phone <span className="text-[oklch(0.85_0.18_195)]">*</span>
                    </Label>
                    <Input
                      type="tel"
                      placeholder="(705) 555-1234"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-white/80 mb-2 block">
                      Boat Make & Model
                    </Label>
                    <Input
                      placeholder="e.g. 2019 Chaparral 23 H2O"
                      value={form.boatMakeModel}
                      onChange={(e) => setForm({ ...form, boatMakeModel: e.target.value })}
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-semibold text-white/80 mb-2 block">
                      Boat Length (ft)
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 24"
                      value={form.boatLength}
                      onChange={(e) => setForm({ ...form, boatLength: e.target.value })}
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-white/80 mb-2 block">
                      Service Interest
                    </Label>
                    <Select
                      value={form.serviceInterest}
                      onValueChange={(val) => setForm({ ...form, serviceInterest: val })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/15 text-white h-12 focus:border-[oklch(0.85_0.18_195)]">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent className="bg-[oklch(0.16_0.018_240)] border-white/15">
                        <SelectItem value="storage-shrinkwrap" className="text-white focus:bg-white/10">Storage + Shrink Wrapping</SelectItem>
                        <SelectItem value="full-package" className="text-white focus:bg-white/10">Full Winter Package</SelectItem>
                        <SelectItem value="shrinkwrap-only" className="text-white focus:bg-white/10">Shrink Wrapping Only</SelectItem>
                        <SelectItem value="winterization" className="text-white focus:bg-white/10">Winterization Only</SelectItem>
                        <SelectItem value="spring-launch" className="text-white focus:bg-white/10">Spring Launch Prep</SelectItem>
                        <SelectItem value="other" className="text-white focus:bg-white/10">Other / General Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-white/80 mb-2 block">
                    Message / Additional Details
                  </Label>
                  <Textarea
                    placeholder="Tell us about your boat, preferred storage dates, or any questions you have..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] min-h-[120px]"
                  />
                </div>
                {submitFallback && (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4">
                    <p className="text-sm font-semibold text-amber-100">We couldn&apos;t send your message just now.</p>
                    <p className="mt-1 text-sm text-amber-100/80">
                      Your message hasn&apos;t been sent yet — please reach us directly and we&apos;ll respond right away:
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-6">
                      <a href={BUSINESS.phoneHref} className="inline-flex items-center gap-2 text-base font-semibold text-white hover:text-[oklch(0.85_0.18_195)]">
                        <Phone className="h-4 w-4 text-[oklch(0.85_0.18_195)]" /> {BUSINESS.phone}
                      </a>
                      <a href={BUSINESS.emailHref} className="inline-flex items-center gap-2 text-base font-semibold text-white hover:text-[oklch(0.85_0.18_195)]">
                        <Mail className="h-4 w-4 text-[oklch(0.85_0.18_195)]" /> {BUSINESS.email}
                      </a>
                    </div>
                  </div>
                )}
                {submitError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{submitError}</div>
                )}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className="w-full h-12 bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] disabled:opacity-40 btn-cyan-glow active:scale-[0.97] transition-all duration-150"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? "Sending…" : "Send Message"}
                  </Button>
                  <p className="text-xs text-white/35 text-center mt-3">
                    We respond within 1–2 business days. For urgent inquiries, please call us directly.
                  </p>
                </div>
              </form>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-5">
              {/* Info Card */}
              <div className="marine-card p-6">
                <h3
                  className="text-xl font-black text-white mb-5"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[oklch(0.85_0.18_195)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">Address</p>
                      <p className="text-sm text-white/60 mt-0.5">
                        639 Concession Road 16 East<br />
                        Tiny, ON L9M 0G8
                      </p>
                      <p className="text-xs text-yellow-400/60 mt-0.5">⚠️ Confirm postal code</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-[oklch(0.85_0.18_195)] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">Phone</p>
                      <a
                        href="tel:+12492016677"
                        className="text-sm text-white/60 hover:text-[oklch(0.85_0.18_195)] transition-colors"
                      >
                        (249) 201-6677
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-[oklch(0.85_0.18_195)] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">Email</p>
                      <a
                        href="mailto:contact@a1marinestorage.ca"
                        className="text-sm text-white/60 hover:text-[oklch(0.85_0.18_195)] transition-colors"
                      >
                        contact@a1marinestorage.ca
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-[oklch(0.85_0.18_195)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">Business Hours</p>
                      <div className="text-sm text-white/60 mt-0.5 space-y-0.5">
                        <p>Mon–Fri: 8:00 AM – 5:00 PM</p>
                        <p>Saturday: 9:00 AM – 3:00 PM</p>
                        <p>Sunday: Closed</p>
                      </div>
                      <p className="text-xs text-yellow-400/60 mt-0.5">⚠️ Confirm hours with owner</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sister Company */}
              <div className="marine-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-3">
                  Part of the A1 Marine Family
                </p>
                <p className="text-sm text-white/60 mb-3">
                  Need detailing, gelcoat restoration, or ceramic coating? Visit our sister company.
                </p>
                <a
                  href="https://a1marinecare.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[oklch(0.85_0.18_195)] hover:text-[oklch(0.78_0.18_195)] transition-colors"
                >
                  A1 Marine Care
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Map */}
      <section className="pb-16 bg-[oklch(0.12_0.018_240)]">
        <div className="container max-w-7xl mx-auto">
          <div className="rounded-2xl overflow-hidden border border-white/10 h-80 md:h-96">
            <MapView
              onMapReady={(map) => {
                const location = { lat: 44.7167, lng: -79.9167 };
                map.setCenter(location);
                map.setZoom(14);
                new google.maps.Marker({
                  position: location,
                  map,
                  title: "A1 Marine Storage — 639 Concession Rd 16 E, Tiny, ON",
                });
              }}
            />
          </div>
          <div className="mt-4 text-center">
            <a
              href="https://maps.google.com/?q=639+Concession+Road+16+East+Tiny+ON"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-[oklch(0.85_0.18_195)] transition-colors"
            >
              Open in Google Maps
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
