// A1 Marine Storage — Frequently Asked Questions (/faq)
// Q&A content is the shared SITE_FAQ registry, which ALSO feeds the FAQPage
// JSON-LD injected server-side (shared/seo.ts). Single source, no duplication.
import { Link } from "wouter";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_FAQ } from "@shared/seo";

export default function FAQ() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Hero */}
      <section className="relative pt-32 pb-12 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-3xl mx-auto relative z-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[oklch(0.6_0.2_27)/10]">
              <HelpCircle className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)]">FAQ</p>
          </div>
          <h1
            className="text-4xl font-black text-white md:text-6xl leading-[1.02]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Boat Storage &amp; Winterization FAQ
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/60 md:text-lg">
            Common questions about seasonal storage, shrink wrapping, winterization, access, and pricing at our Tiny,
            Ontario yard. Don't see yours? Just ask.
          </p>
        </div>
      </section>

      {/* Q&A */}
      <section className="section-space">
        <div className="container max-w-3xl mx-auto space-y-4">
          {SITE_FAQ.map((item) => (
            <div key={item.q} className="marine-card p-6">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {item.q}
              </h2>
              <p className="mt-2 text-base text-white/65 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section-space bg-black">
        <div className="container max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl font-black text-white md:text-4xl"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Still have a question?
          </h2>
          <p className="mt-3 text-base text-white/60">Get an instant quote or reach out — we're happy to help.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
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
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
