// A1 Marine Storage — Winter storage ad landing page (/winter-quote)
// Conversion-focused destination for Meta/Google campaigns. Captures the lead
// (with UTM attribution) via the shared QuoteRequestForm. Kept out of the
// sitemap (registry sitemapExclude) but self-canonical + indexable.
import { Shield, Snowflake, Wrench, CheckCircle2 } from "lucide-react";
import { QuoteRequestForm } from "@/components/QuoteRequestForm";
import { RATES } from "@/lib/storage-pricing";

const points = [
  { icon: Shield, title: "Secure, gated lot", desc: "Fenced, monitored storage on our Tiny, ON yard — controlled access all winter." },
  { icon: Snowflake, title: "Professional shrink wrap", desc: "Vented, framed heat-shrink that sheds snow and blocks UV — not a flapping tarp." },
  { icon: Wrench, title: "Full winterization", desc: "Engine fogging, antifreeze, fuel stabilizer, and battery care so nothing freezes." },
];

export default function WinterQuote() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Hero + form */}
      <section className="relative pt-32 pb-16 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-6xl mx-auto relative z-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Pitch */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-4">
                Winter Boat Storage · Georgian Bay
              </p>
              <h1
                className="text-4xl font-black text-white md:text-6xl leading-[1.02]"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Reserve secure winter storage for your boat.
              </h1>
              <p className="mt-5 max-w-xl text-base text-white/70 md:text-lg leading-relaxed">
                Secure storage, professional shrink wrapping, and full winterization at our gated Tiny, Ontario yard —
                minutes from Georgian Bay. One team from fall haul-out to spring launch. Space is limited each season.
              </p>
              <div className="mt-8 space-y-4">
                {points.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.title} className="flex gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.6_0.2_27)/10]">
                        <Icon className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-white">{p.title}</p>
                        <p className="mt-0.5 text-sm text-white/60 leading-relaxed">{p.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-white/60">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[oklch(0.6_0.2_27)]" /> Storage from {RATES.outdoorPerFoot}/ft
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[oklch(0.6_0.2_27)]" /> Wrapping from {RATES.shrinkPerFoot}/ft
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[oklch(0.6_0.2_27)]" /> Bundle &amp; save
                </span>
              </div>
            </div>

            {/* Lead form */}
            <div className="lg:pt-2">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Get your winter storage quote
                </h2>
                <p className="mt-1 text-sm text-white/55">Tell us about your boat — we'll send pricing and availability.</p>
              </div>
              <QuoteRequestForm page="/winter-quote" serviceContext="Winter storage quote" submitLabel="Get My Quote" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
