// A1 Marine Storage — locality page template (/boat-storage/[locality]).
// Data-driven from @shared/localities; unique intro + FAQ per town. Pricing is
// engine-derived (storage-pricing.ts). Meta + Service/LocalBusiness/FAQPage/
// Breadcrumb JSON-LD are injected server-side from the SEO registry.
import { useRoute, Link } from "wouter";
import { ArrowRight, Shield, Snowflake, Wrench, MapPin, Clock, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteRequestForm } from "@/components/QuoteRequestForm";
import { AreasWeServe } from "@/components/AreasWeServe";
import { RATES, WINTERIZATION } from "@/lib/storage-pricing";
import { BUSINESS } from "@/content/business";
import { trackPhoneClick } from "@/lib/analytics";
import { findLocality, localityFaq } from "@shared/localities";
import NotFound from "./NotFound";

const priceCards = [
  { icon: Shield, title: "Outdoor Storage", from: `from ${RATES.outdoorPerFoot}/ft`, note: `Seasonal · ${RATES.outdoorMin} minimum`, href: "/boat-storage" },
  { icon: Snowflake, title: "Shrink Wrapping", from: `from ${RATES.shrinkPerFoot}/ft`, note: `Vented & framed · ${RATES.shrinkMin} minimum`, href: "/shrink-wrapping" },
  { icon: Wrench, title: "Winterization", from: `from ${WINTERIZATION[0].price}`, note: "Flat rate by engine type", href: "/winterization" },
];

export default function LocalityPage() {
  const [, params] = useRoute("/boat-storage/:locality");
  const loc = params ? findLocality(params.locality) : undefined;
  if (!loc) return <NotFound />;
  const faq = localityFaq(loc);

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Hero */}
      <section className="relative pt-32 pb-14 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-4xl mx-auto relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-4">
            Winter Boat Storage · {loc.waters}
          </p>
          <h1
            className="text-4xl font-black text-white md:text-6xl leading-[1.02]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Boat Storage &amp; Shrink Wrapping in {loc.name}
          </h1>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[oklch(0.6_0.2_27)]" /> About {loc.driveMin} minutes from our Tiny, ON yard
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[oklch(0.6_0.2_27)]" /> 639 Concession Road 16 East, Tiny
            </span>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              size="lg"
              className="h-14 px-8 text-base font-semibold bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow"
            >
              <Link href="/calculator">
                Get an Instant Quote <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 px-8 text-base font-semibold border-white/30 bg-white/5 text-white hover:border-white/60 hover:bg-white/10 hover:text-white"
            >
              <a href={BUSINESS.phoneHref} onClick={() => trackPhoneClick(`locality-${loc.slug}`)}>
                <Phone className="mr-2 h-4 w-4" /> {BUSINESS.phone}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Unique intro */}
      <section className="section-space">
        <div className="container max-w-3xl mx-auto">
          <p className="text-base leading-[1.8] text-white/70 md:text-[1.05rem]">{loc.intro}</p>
        </div>
      </section>

      {/* Engine-derived pricing (concise) */}
      <section className="section-space bg-black">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-white md:text-4xl mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {loc.name} winter storage pricing
          </h2>
          <p className="mb-8 max-w-2xl text-base text-white/60">
            Transparent, per-foot pricing — the same rates for every town we serve. Bundle storage, wrap, and winterizing
            to save.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {priceCards.map((c) => {
              const Icon = c.icon;
              return (
                <Link key={c.title} href={c.href}>
                  <div className="marine-card p-5 h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[oklch(0.6_0.2_27)/30]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[oklch(0.6_0.2_27)/10] mb-3">
                      <Icon className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
                    </div>
                    <h3 className="text-base font-bold text-white">{c.title}</h3>
                    <p className="mt-1 text-lg font-black text-[oklch(0.6_0.2_27)] tabular-nums">{c.from}</p>
                    <p className="mt-1 text-xs text-white/50">{c.note}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-white/45">
            Rates come from our live pricing engine. See the full{" "}
            <Link href="/pricing" className="text-[oklch(0.6_0.2_27)] hover:underline">pricing breakdown</Link> or build an
            exact quote in the{" "}
            <Link href="/calculator" className="text-[oklch(0.6_0.2_27)] hover:underline">calculator</Link>. HST applies.
          </p>
        </div>
      </section>

      {/* Locality quote form */}
      <section className="section-space">
        <div className="container max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-white md:text-4xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Get a {loc.name} storage quote
          </h2>
          <p className="mt-2 mb-6 text-base text-white/60">
            Tell us about your boat and we'll send pricing and availability for the season.
          </p>
          <QuoteRequestForm
            page={`/boat-storage/${loc.slug}`}
            locality={loc.name}
            formType="winter-storage-quote"
            serviceContext={`Winter storage — ${loc.name}`}
            submitLabel="Get My Quote"
          />
        </div>
      </section>

      {/* FAQ (rendered; FAQPage JSON-LD is injected server-side) */}
      <section className="section-space bg-black">
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-white md:text-4xl mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {loc.name} boat storage — FAQ
          </h2>
          <div className="space-y-4">
            {faq.map((item) => (
              <div key={item.q} className="marine-card p-6">
                <h3 className="text-base font-bold text-white">{item.q}</h3>
                <p className="mt-2 text-base text-white/65 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-space">
        <div className="container max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
            Our services for {loc.name} boats
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { href: "/boat-storage", label: "Outdoor Boat Storage", desc: "Secure, fenced, monitored seasonal storage on your trailer." },
              { href: "/shrink-wrapping", label: "Shrink Wrapping", desc: "Vented, framed heat-shrink that sheds snow all winter." },
              { href: "/winterization", label: "Winterization", desc: "Engine, outdrive, and plumbing protected from the freeze." },
            ].map((s) => (
              <Link key={s.href} href={s.href}>
                <div className="marine-card p-5 h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[oklch(0.6_0.2_27)/30]">
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    {s.label} <ArrowRight className="h-4 w-4 text-[oklch(0.6_0.2_27)]" />
                  </h3>
                  <p className="mt-2 text-sm text-white/55 leading-relaxed">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AreasWeServe currentSlug={loc.slug} heading="Other areas we serve" />
    </div>
  );
}
