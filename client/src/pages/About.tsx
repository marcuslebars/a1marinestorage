// A1 Marine Storage — About (/about). Lean entity/story page. Copy is distinct
// from /facility (which covers the site & hours); this covers who we are.
import { Link } from "wouter";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/content/business";
import { trackPhoneClick } from "@/lib/analytics";

export default function About() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Hero */}
      <section className="relative pt-32 pb-12 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-3xl mx-auto relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-4">About Us</p>
          <h1
            className="text-4xl font-black text-white md:text-6xl leading-[1.02]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            About A1 Marine Storage
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/60 md:text-lg">
            The seasonal storage and winterizing division of A1 Marine Care — serving Georgian Bay and Lake Simcoe from
            Tiny, Ontario.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="section-space">
        <div className="container max-w-3xl mx-auto space-y-5 text-base leading-[1.75] text-white/70 md:text-[1.05rem]">
          <p>
            A1 Marine Storage is the seasonal storage and winterizing division of A1 Marine Care — the mobile
            boat-detailing team that has looked after Georgian Bay and Lake Simcoe boats for years. We built the storage
            yard at 639 Concession Road 16 East in Tiny to give local boat owners a secure, professional alternative to
            leaving a boat exposed in a driveway or field all winter.
          </p>
          <p>
            Everything happens in one place, with one team: fall haul-out, professional shrink wrapping, full
            winterization, secure storage on a fenced and monitored lot, and spring commissioning when it's time to
            launch. Because we're boaters ourselves, we treat every boat on the lot the way we'd want ours treated —
            blocked properly, wrapped tight, and watched over through the freeze-thaw months.
          </p>
          <p>
            We're a local, owner-operated business serving Tiny, Midland, Penetanguishene, Wasaga Beach, and the wider
            Georgian Bay area. Pricing is transparent and per foot, quotes are instant, and there are no monthly
            surprises. If you're new to us, the best place to start is an instant quote or a quick call.
          </p>
        </div>
      </section>

      {/* NAP + links */}
      <section className="section-space bg-black">
        <div className="container max-w-3xl mx-auto">
          <div className="marine-card p-6 md:p-8">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-[oklch(0.6_0.2_27)] mt-0.5" />
              <div>
                <p className="text-base font-bold text-white">{BUSINESS.name}</p>
                <p className="mt-1 text-sm text-white/60">
                  {BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region}{" "}
                  {BUSINESS.address.postalCode}
                </p>
                <p className="mt-1 text-sm text-white/60">Monday–Friday, 9 AM–6 PM · By appointment only</p>
                <a
                  href={BUSINESS.phoneHref}
                  onClick={() => trackPhoneClick("about")}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[oklch(0.6_0.2_27)] hover:underline"
                >
                  <Phone className="h-4 w-4" /> {BUSINESS.phone}
                </a>
              </div>
            </div>
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
              <Link href="/facility">Tour the Facility</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
