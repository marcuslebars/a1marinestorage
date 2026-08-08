// A1 Marine Storage — Services Page
// Prices are engine-derived (client/src/lib/storage-pricing.ts) so they stay in
// step with the calculator. Services carrying no engine price have been removed —
// see storage-pricing.test.ts for the enforced exclusion list.
// SEO: "shrink wrapping Midland", "boat winterization Tiny Ontario", "spring boat launch Georgian Bay"
import { Link } from "wouter";
import { Snowflake, Shield, Wrench, Sun, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCardMedia } from "@/components/ServiceCardMedia";
import { RATES, WINTERIZATION } from "@/lib/storage-pricing";

// Real facility photos only (client/public) — never external/stock imagery. Services we
// don't yet have a real photo of (shrink wrap, winterization, spring launch) render the
// branded ServiceCardMedia fallback until the owner supplies one.
const OUTDOOR_IMG = "/facility-aerial.jpg"; // aerial of the storage yard (rows of wrapped boats)
const SECURITY_IMG = "/facility-front.jpg"; // real — gated entrance / drive-up

const services = [
  {
    id: "shrink-wrapping",
    icon: Snowflake,
    title: "Shrink Wrapping",
    subtitle: "Professional-grade winter protection",
    img: "/shrink-wrapping.jpg",
    description:
      "Our professional boat shrink wrapping service uses commercial-grade white heat-shrink film to create a tight, weatherproof seal around your entire vessel. Every wrap includes strategically placed ventilation ports to prevent moisture buildup and mould growth — a critical detail that separates professional wrapping from DIY attempts.",
    features: [
      "Commercial-grade white UV-resistant heat-shrink film",
      "Ventilation ports installed for airflow and mould prevention",
      "Full boat coverage including bow, stern, and all protrusions",
      "Protects against snow load, ice, UV radiation, and debris",
      "Neat, professional finish with secure bottom strapping",
      "Custom door/zipper access panels available on request",
    ],
    note: null,
    pricing: `Starting at ${RATES.shrinkPerFoot}/ft — see Pricing page`,
  },
  {
    id: "outdoor-storage",
    icon: Shield,
    title: "Outdoor Winter Storage",
    subtitle: "Secure seasonal storage at our Tiny, ON facility",
    img: OUTDOOR_IMG,
    description:
      "Our storage yard at 639 Concession Road 16 East, Tiny, ON offers economical outdoor seasonal storage on a secured, fenced lot — particularly effective when combined with professional shrink wrapping. Your boat is professionally blocked and positioned on its trailer, with planned spring access.",
    features: [
      "Secured, fenced outdoor lot with proper drainage",
      "Boats professionally blocked and stabilized for the season",
      "Boats remain on the owner's trailer throughout storage",
      "Monitored throughout the winter",
      "Seasonal pricing (fall to spring) — no monthly surprises",
      "Accessible by appointment during business hours",
    ],
    note: null,
    pricing: `Outdoor storage from ${RATES.outdoorPerFoot}/ft/season`,
  },
  {
    id: "winterization",
    icon: Wrench,
    title: "Winterization",
    subtitle: "Protect your engine and systems from freeze damage",
    img: "/winterization.jpg",
    description:
      "Proper winterization is the single most important thing you can do to protect your engine and mechanical systems from Ontario's harsh winters. Our winterization service follows industry-standard procedures to ensure every system is properly protected before temperatures drop.",
    features: [
      "Engine flush with fresh water to remove salt, sediment, and debris",
      "Engine fogging oil applied to cylinder walls for corrosion protection",
      "Marine antifreeze flushed through engine block, manifolds, and cooling lines",
      "Fuel stabilizer added to tank and engine run to distribute treatment",
      "Battery disconnected, load-tested, and removed or stored on trickle charger",
      "Drain plug removed and stored in a visible location",
      "Bilge pumped dry and bilge plug removed",
    ],
    note: null,
    pricing: `Flat rate by engine type — from ${WINTERIZATION[0].price}`,
  },
  {
    id: "spring-launch",
    icon: Sun,
    title: "Spring Commissioning",
    subtitle: "De-winterizing and launch-ready service",
    img: "/spring-launch.jpg",
    description:
      "When the ice breaks and Georgian Bay calls, we'll have your boat ready to go. Our spring commissioning service reverses the winterization process and gets your boat launch-ready — so you can spend your weekend on the lake, not in the driveway.",
    features: [
      "De-winterization and fresh water flush",
      "Battery reconnect, test, and reinstallation",
      "Fluid and belt checks",
      "Drain plug reinstallation and systems verification",
      "Engine run to operating temperature",
      "Launch readiness check",
    ],
    note: null,
    pricing: `${RATES.springCommissioning} flat`,
  },
  {
    id: "security",
    icon: Lock,
    title: "Facility Security",
    subtitle: "Your investment is protected all season",
    img: SECURITY_IMG,
    description:
      "We take the security of your vessel seriously. Our Tiny, ON storage facility is designed to keep your boat safe and protected throughout the off-season.",
    features: [
      "Fully fenced and gated property",
      "24/7 video surveillance cameras",
      "Controlled access — entry by appointment or access code",
      "Well-lit facility for evening access",
      "Monitored throughout the storage season",
      "Rural location with low traffic and high visibility",
    ],
    note: null,
    pricing: "Included with all storage packages",
  },
];

export default function Services() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Page Hero */}
      <section className="relative pt-32 pb-16 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-7xl mx-auto relative z-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-4">
            What We Offer
          </p>
          <h1
            className="text-5xl font-black text-white md:text-7xl"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Our Storage Services
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base text-white/60 md:text-lg">
            Complete seasonal boat care from fall haul-out to spring launch. One facility, one team, zero hassle.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow"
            >
              <Link href="/calculator">Get an Instant Quote</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white/80 hover:border-white/40 hover:text-white"
            >
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services List */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto space-y-16">
          {services.map((service, i) => {
            const Icon = service.icon;
            const isEven = i % 2 === 0;
            return (
              <div
                key={service.id}
                id={service.id}
                className="scroll-mt-20 grid gap-10 lg:grid-cols-2 lg:gap-16 items-center"
              >
                {/* Image / Icon Block */}
                <div className={isEven ? "order-1" : "order-1 lg:order-2"}>
                  <ServiceCardMedia src={service.img} alt={service.title} Icon={Icon} variant="feature" />
                </div>

                {/* Content Block */}
                <div className={isEven ? "order-2" : "order-2 lg:order-1"}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.6_0.2_27)/10]">
                      <Icon className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[oklch(0.6_0.2_27)]">
                        {service.subtitle}
                      </p>
                    </div>
                  </div>
                  <h2
                    className="text-3xl font-black text-white md:text-4xl mb-4"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {service.title}
                  </h2>
                  <p className="text-base text-white/65 leading-relaxed mb-6">
                    {service.description}
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-[oklch(0.6_0.2_27)] mt-0.5 shrink-0" />
                        <span className="text-sm text-white/65">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {service.note && (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 mb-5">
                      <p className="text-xs text-yellow-400/80">{service.note}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white/50">{service.pricing}</p>
                    <Button
                      asChild
                      size="sm"
                      className="bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.53_0.2_27)]"
                    >
                      <Link href="/calculator">
                        Get Quote
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bundle CTA */}
      <section className="section-space bg-black border-t border-white/10">
        <div className="container max-w-7xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
            Best Value
          </p>
          <h2
            className="text-4xl font-black text-white md:text-5xl mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Full Winter Package
          </h2>
          <p className="text-base text-white/60 max-w-xl mx-auto mb-8">
            Bundle storage + shrink wrapping + winterization for the best per-season rate. One call, one invoice, complete peace of mind.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow"
            >
              <Link href="/pricing">See Bundle Pricing</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white/80 hover:border-white/40 hover:text-white"
            >
              <Link href="/calculator">Build Your Quote</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
