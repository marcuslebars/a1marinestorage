// Shared layout for the individual (keyword-targeted) service pages:
// /boat-storage, /shrink-wrapping, /winterization. Copy is unique per page (SEO);
// pricing is passed in as an engine-derived slot. JSON-LD for these routes lives
// in the shared SEO registry (shared/seo.ts), injected server-side.
import { type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Phone, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/content/business";
import { trackPhoneClick } from "@/lib/analytics";

export interface ServiceInclude {
  title: string;
  desc: string;
}
export interface RelatedLink {
  href: string;
  label: string;
  desc: string;
}

interface ServicePageLayoutProps {
  icon: LucideIcon;
  eyebrow: string;
  h1: string;
  lede: string;
  /** Unique 2–3 paragraph intro (SEO body copy). */
  intro: ReactNode;
  includes: ServiceInclude[];
  pricingHeading: string;
  pricingIntro?: ReactNode;
  /** Engine-derived pricing block (never hardcoded). */
  pricing: ReactNode;
  related: RelatedLink[];
}

const RED = "oklch(0.6_0.2_27)";

export function ServicePageLayout({
  icon: Icon,
  eyebrow,
  h1,
  lede,
  intro,
  includes,
  pricingHeading,
  pricingIntro,
  pricing,
  related,
}: ServicePageLayoutProps) {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Hero */}
      <section className="relative pt-32 pb-14 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[oklch(0.6_0.2_27)/10]">
              <Icon className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)]">{eyebrow}</p>
          </div>
          <h1
            className="text-4xl font-black text-white md:text-6xl leading-[1.02]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {h1}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-white/65 md:text-lg leading-relaxed">{lede}</p>
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
              <a href={BUSINESS.phoneHref} onClick={() => trackPhoneClick("service-hero")}>
                <Phone className="mr-2 h-4 w-4" /> {BUSINESS.phone}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Intro prose */}
      <section className="section-space">
        <div className="container max-w-3xl mx-auto space-y-5 text-base leading-[1.75] text-white/70 md:text-[1.05rem]">
          {intro}
        </div>
      </section>

      {/* What's included */}
      <section className="section-space bg-black">
        <div className="container max-w-5xl mx-auto">
          <h2
            className="text-3xl font-black text-white md:text-4xl mb-8"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            What's included
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {includes.map((item) => (
              <div key={item.title} className="marine-card p-5 flex gap-3.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[oklch(0.6_0.2_27)] mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-white/60 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing (engine-derived) */}
      <section className="section-space">
        <div className="container max-w-4xl mx-auto">
          <h2
            className="text-3xl font-black text-white md:text-4xl mb-3"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {pricingHeading}
          </h2>
          {pricingIntro && <p className="mb-6 max-w-2xl text-base text-white/60 leading-relaxed">{pricingIntro}</p>}
          {pricing}
          <p className="mt-5 text-sm text-white/45">
            Rates come from our live pricing engine and are always in step with the{" "}
            <Link href="/calculator" className={`text-[${RED}] hover:underline`}>quote calculator</Link>. HST applies.
            See the full{" "}
            <Link href="/pricing" className={`text-[${RED}] hover:underline`}>pricing breakdown</Link>.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="h-14 px-8 text-base font-semibold bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow"
            >
              <Link href="/calculator">
                Build Your Quote <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Related services */}
      <section className="section-space bg-black">
        <div className="container max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">Related services</p>
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((r) => (
              <Link key={r.href} href={r.href}>
                <div className="marine-card p-5 h-full cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[oklch(0.6_0.2_27)/30]">
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    {r.label} <ArrowRight className="h-4 w-4 text-[oklch(0.6_0.2_27)]" />
                  </h3>
                  <p className="mt-2 text-sm text-white/55 leading-relaxed">{r.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
