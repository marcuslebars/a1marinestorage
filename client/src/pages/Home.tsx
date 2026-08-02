// A1 Marine Storage — Home Page
// Style: Contemporary Coastal Modernism — cinematic hero, dark harbor, red accents
// SEO: "boat storage Tiny Ontario", "shrink wrapping Midland", "winter boat storage Georgian Bay"
import { Link } from "wouter";
import { ArrowRight, Shield, Snowflake, Wrench, Sun, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RATES, WINTERIZATION } from "@/lib/storage-pricing";
import { useEffect, useRef } from "react";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/VHzsy7iWSckjLQV8t62ZhN/hero-storage-facility-cQ5KsxQarVqwSmuxTc9X9F.webp";
const SHRINK_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/VHzsy7iWSckjLQV8t62ZhN/shrink-wrap-service-57oifYehxkp4z67eHW4cAc.webp";
const INDOOR_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/VHzsy7iWSckjLQV8t62ZhN/indoor-storage-apY9PKtmA8reaijP5bqUq3.webp";
const WINTER_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/VHzsy7iWSckjLQV8t62ZhN/winterization-service-ZEgrfSXyrsmSHLKqGrhDUu.webp";

const services = [
  {
    icon: Snowflake,
    title: "Shrink Wrapping",
    desc: "Professional-grade white heat-shrink film with vents installed. Protects against snow, ice, UV, and debris all winter.",
    href: "/services#shrink-wrapping",
    img: SHRINK_IMG,
    price: `From ${RATES.shrinkPerFoot}/ft`,
  },
  {
    icon: Shield,
    title: "Outdoor Storage",
    desc: "Secure seasonal storage on our fenced Tiny, ON lot — professionally blocked and positioned on your trailer, monitored all winter.",
    href: "/services#outdoor-storage",
    img: INDOOR_IMG,
    price: `From ${RATES.outdoorPerFoot}/ft/season`,
  },
  {
    icon: Wrench,
    title: "Winterization",
    desc: "Engine flush & fogging, antifreeze in engine and lines, fuel stabilizer, battery disconnect, drain plug removal.",
    href: "/services#winterization",
    img: WINTER_IMG,
    price: `From ${WINTERIZATION[0].price}`,
  },
  {
    icon: Sun,
    title: "Spring Commissioning",
    desc: "De-winterization, battery reconnect and test, fluid and system checks, and an engine run to temperature — launch-ready for spring.",
    href: "/services#spring-launch",
    img: null,
    price: `${RATES.springCommissioning} flat`,
  },
];

const whyPoints = [
  "Secure, gated facility with 24/7 video surveillance and controlled access — your investment is protected all season.",
  "Competitive per-foot pricing with transparent, no-surprise quotes. Bundle storage + shrink wrap + winterizing for maximum value.",
  "We handle everything from fall haul-out to spring launch. One call, one team, zero hassle.",
  "Part of the A1 Marine family — the same trusted team that details Georgian Bay's finest boats.",
];

const stats = [
  { value: "2+", label: "Seasons of Storage" },
  { value: "100+", label: "Boats Stored" },
  { value: "639", label: "Concession Rd 16 E" },
  { value: "5★", label: "Service Standard" },
];

function useIntersectionAnimation(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("animate-fade-up");
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

export default function Home() {
  const statsRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const whyRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useIntersectionAnimation(statsRef as React.RefObject<HTMLElement>);
  useIntersectionAnimation(servicesRef as React.RefObject<HTMLElement>);
  useIntersectionAnimation(whyRef as React.RefObject<HTMLElement>);
  useIntersectionAnimation(ctaRef as React.RefObject<HTMLElement>);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-black">
        <img
          src={HERO_IMG}
          alt="A1 Marine Storage facility in Tiny, Ontario — secure seasonal boat storage"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        <div className="container max-w-7xl mx-auto relative z-10 flex min-h-screen items-center py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[oklch(0.6_0.2_27)] mb-6">
              A1 Marine Storage · Tiny, Ontario
            </p>
            <h1
              className="text-6xl font-black leading-[0.92] text-white sm:text-7xl md:text-8xl lg:text-[6rem]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Your Boat Deserves<br />
              <span className="text-[oklch(0.6_0.2_27)]">a Safe Winter.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/75 md:text-xl">
              Secure seasonal storage, professional shrink wrapping, and full winterization for boat owners across Georgian Bay and Lake Simcoe.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 px-10 text-base font-semibold bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow active:scale-[0.97] transition-all duration-150"
              >
                <Link href="/calculator">
                  Get an Instant Quote
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 px-10 text-base font-semibold border-white/30 bg-white/5 text-white hover:border-white/60 hover:bg-white/10 hover:text-white active:scale-[0.97] transition-all duration-150"
              >
                <Link href="/services">View All Services</Link>
              </Button>
            </div>
            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-4">
              {["Gated & Secured Facility", "Georgian Bay Area", "Sister Company of A1 Marine Care"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.6_0.2_27)]" />
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-y border-white/10 bg-black py-8 md:py-10">
        <div
          ref={statsRef}
          className="container max-w-7xl mx-auto opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p
                  className="text-3xl font-black text-white md:text-4xl"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="section-space bg-[oklch(0.12_0.018_240)]">
        <div className="container max-w-7xl mx-auto">
          <div
            ref={servicesRef}
            className="opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="mb-12 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
                What We Offer
              </p>
              <h2
                className="text-4xl font-black text-white md:text-5xl"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Complete Winter Care for Your Boat
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-base text-white/60">
                From fall haul-out to spring launch, we handle every step of seasonal boat care at our secure Tiny, Ontario facility.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {services.map((service, i) => {
                const Icon = service.icon;
                return (
                  <Link key={service.title} href={service.href}>
                    <div
                      className="group marine-card overflow-hidden cursor-pointer hover:border-[oklch(0.6_0.2_27)/30] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_oklch(0.6_0.2_27/0.2)]"
                      style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                    >
                      {service.img && (
                        <div className="relative h-44 overflow-hidden">
                          <img
                            src={service.img}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.16_0.018_240)] via-transparent to-transparent" />
                        </div>
                      )}
                      {!service.img && (
                        <div className="h-44 bg-gradient-to-br from-[oklch(0.20_0.02_240)] to-[oklch(0.14_0.015_240)] flex items-center justify-center">
                          <Icon className="h-16 w-16 text-[oklch(0.6_0.2_27)/30]" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[oklch(0.6_0.2_27)/10]">
                            <Icon className="h-4 w-4 text-[oklch(0.6_0.2_27)]" />
                          </div>
                          <h3 className="text-base font-bold text-white">{service.title}</h3>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed">{service.desc}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-[oklch(0.6_0.2_27)] tabular-nums">{service.price}</span>
                          <span className="text-xs font-semibold text-[oklch(0.6_0.2_27)] flex items-center gap-1 group-hover:gap-2 transition-all">
                            Learn more <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-10 text-center">
              <Button
                asChild
                variant="outline"
                className="border-white/20 text-white/80 hover:border-[oklch(0.6_0.2_27)] hover:text-[oklch(0.6_0.2_27)] transition-all"
              >
                <Link href="/services">
                  View All Services
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="section-space bg-black">
        <div className="container max-w-7xl mx-auto">
          <div
            ref={whyRef}
            className="opacity-0"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
                  Why Choose A1 Marine Storage
                </p>
                <h2
                  className="text-4xl font-black text-white md:text-5xl leading-tight mb-8"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Trusted by Georgian Bay Boat Owners
                </h2>
                <div className="space-y-5">
                  {whyPoints.map((point, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[oklch(0.6_0.2_27)/10] mt-0.5">
                        <span
                          className="text-sm font-black text-[oklch(0.6_0.2_27)]"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                        >
                          {i + 1}
                        </span>
                      </div>
                      <p className="text-base text-white/70 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-10">
                  <Button
                    asChild
                    className="bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow active:scale-[0.97] transition-all duration-150"
                  >
                    <Link href="/facility">Tour Our Facility</Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden border border-white/10">
                  <img
                    src={INDOOR_IMG}
                    alt="A1 Marine Storage indoor facility — clean, secure, well-lit"
                    className="w-full h-80 object-cover md:h-96"
                  />
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-4 marine-card p-4 max-w-[200px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[oklch(0.6_0.2_27)] text-[oklch(0.6_0.2_27)]" />
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-white">Trusted by local boat owners</p>
                  <p className="text-xs text-white/50 mt-0.5">Georgian Bay Area</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — reviews coming soon (real reviews to be added) */}
      <section className="section-space bg-[oklch(0.12_0.018_240)]">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
              What Our Clients Say
            </p>
            <h2
              className="text-4xl font-black text-white md:text-5xl"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Reviews Coming Soon
            </h2>
            <p className="mt-4 text-base text-white/50 max-w-xl mx-auto">
              We're just getting started. Be one of our first clients and help us build our reputation in the Georgian Bay area.
            </p>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section
        ref={ctaRef}
        className="relative section-space overflow-hidden opacity-0"
        style={{ animationDelay: "0.1s" }}
      >
        <img
          src={HERO_IMG}
          alt="A1 Marine Storage facility"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/70" />
        <div className="container max-w-7xl mx-auto relative z-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-4">
            Ready to Store Your Boat?
          </p>
          <h2
            className="text-4xl font-black text-white md:text-6xl mb-6"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Get Your Instant Storage Estimate
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
            Use our interactive calculator to estimate your seasonal storage, shrink wrapping, and winterization costs in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-base font-semibold bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow active:scale-[0.97] transition-all duration-150"
            >
              <Link href="/calculator">
                Open Storage Calculator
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 px-10 text-base font-semibold border-white/30 bg-white/5 text-white hover:border-white/60 hover:bg-white/10 hover:text-white active:scale-[0.97] transition-all duration-150"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* SERVICE AREA STRIP */}
      <section className="border-t border-white/10 bg-black py-8">
        <div className="container max-w-7xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-3">
            Serving
          </p>
          <p className="text-sm text-white/60">
            Tiny · Midland · Penetanguishene · Wasaga Beach · Georgian Bay · Lake Simcoe · Barrie · Orillia
          </p>
        </div>
      </section>
    </div>
  );
}
