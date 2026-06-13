// A1 Marine Storage — Services Page
// SEO: "shrink wrapping Midland", "boat winterization Tiny Ontario", "spring boat launch Georgian Bay"
import { Link } from "wouter";
import { Snowflake, Shield, Wrench, Sun, Truck, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SHRINK_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/VHzsy7iWSckjLQV8t62ZhN/shrink-wrap-service-57oifYehxkp4z67eHW4cAc.webp";
const INDOOR_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/VHzsy7iWSckjLQV8t62ZhN/indoor-storage-apY9PKtmA8reaijP5bqUq3.webp";
const WINTER_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/VHzsy7iWSckjLQV8t62ZhN/winterization-service-ZEgrfSXyrsmSHLKqGrhDUu.webp";

const services = [
  {
    id: "shrink-wrapping",
    icon: Snowflake,
    title: "Shrink Wrapping",
    subtitle: "Professional-grade winter protection",
    img: SHRINK_IMG,
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
    pricing: "Starting at $X.XX/ft — see Pricing page",
  },
  {
    id: "indoor-storage",
    icon: Shield,
    title: "Indoor & Outdoor Storage",
    subtitle: "Secure seasonal storage at our Tiny, ON facility",
    img: INDOOR_IMG,
    description:
      "Our storage facility at 639 Concession Road 16 East, Tiny, ON offers both indoor and outdoor seasonal storage options. Indoor storage provides maximum protection from the elements in our clean, well-lit building. Outdoor storage on our secured, fenced lot is an economical option — particularly effective when combined with professional shrink wrapping.",
    features: [
      "Indoor storage: clean, well-lit, unheated building — ⚠️ confirm if heated option available",
      "Outdoor storage: level, gravel-surfaced lot with proper drainage",
      "All storage spots are blocked and stabilized for safety",
      "Boats remain on owner's trailer throughout the season",
      "Seasonal pricing (fall to spring) — no monthly surprises",
      "Accessible by appointment during business hours",
    ],
    note: "⚠️ OPEN ITEM: Confirm indoor vs. outdoor availability and capacity with owner before launch.",
    pricing: "Indoor from $X.XX/ft/season · Outdoor from $X.XX/ft/season",
  },
  {
    id: "winterization",
    icon: Wrench,
    title: "Winterization",
    subtitle: "Protect your engine and systems from freeze damage",
    img: WINTER_IMG,
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
      "Gear oil checked and changed if needed — ⚠️ confirm if included",
    ],
    note: "⚠️ OPEN ITEM: Confirm exact winterization package inclusions and pricing with owner.",
    pricing: "Starting at $XXX flat or $X.XX/ft — see Pricing page",
  },
  {
    id: "spring-launch",
    icon: Sun,
    title: "Spring Launch Prep",
    subtitle: "De-winterizing and shrink wrap removal",
    img: null,
    description:
      "When the ice breaks and Georgian Bay calls, we'll have your boat ready to go. Our spring launch prep service reverses the winterization process, removes and disposes of your shrink wrap, and gets your boat ready for the water — so you can spend your weekend on the lake, not in the driveway.",
    features: [
      "Shrink wrap removal and proper disposal (no mess left behind)",
      "Battery reinstallation and system check",
      "Engine de-winterizing and fresh water flush",
      "Drain plug reinstallation",
      "Visual inspection and launch readiness check",
      "Coordination with your marina or launch ramp — ⚠️ confirm if offered",
    ],
    note: "⚠️ OPEN ITEM: Confirm exact spring service inclusions with owner.",
    pricing: "Shrink wrap removal from $X.XX/ft or $XXX flat",
  },
  {
    id: "trailer-storage",
    icon: Truck,
    title: "Trailer & Equipment Storage",
    subtitle: "Off-season storage for trailers and PWCs",
    img: null,
    description:
      "Don't let your trailer take up valuable driveway space all winter. We offer seasonal storage for boat trailers, personal watercraft (PWCs/Jet Skis), and other marine equipment at our Tiny, ON facility.",
    features: [
      "Seasonal trailer storage on our secured outdoor lot",
      "PWC / Jet Ski storage available — ⚠️ confirm capacity",
      "Flat-rate seasonal pricing — no per-foot calculation",
      "Stored alongside your boat for convenient spring pickup",
    ],
    note: "⚠️ OPEN ITEM: Confirm trailer storage availability, pricing, and capacity with owner.",
    pricing: "Starting at $XXX/season — see Pricing page",
  },
  {
    id: "security",
    icon: Lock,
    title: "Facility Security",
    subtitle: "Your investment is protected all season",
    img: null,
    description:
      "We take the security of your vessel seriously. Our Tiny, ON storage facility is designed to keep your boat safe and protected throughout the off-season.",
    features: [
      "Fully fenced and gated property — ⚠️ confirm fence type",
      "24/7 video surveillance cameras — ⚠️ confirm if installed",
      "Controlled access — entry by appointment or access code",
      "Well-lit facility for evening access",
      "On-site monitoring — ⚠️ confirm monitoring details",
      "Rural location with low traffic and high visibility",
    ],
    note: "⚠️ OPEN ITEM: Confirm actual security features present at the facility with owner before launch.",
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.18_195)] mb-4">
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
              className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] btn-cyan-glow"
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
                  {service.img ? (
                    <div className="rounded-2xl overflow-hidden border border-white/10">
                      <img
                        src={service.img}
                        alt={service.title}
                        className="w-full h-72 object-cover md:h-80"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-[oklch(0.16_0.018_240)] h-72 flex items-center justify-center">
                      <Icon className="h-24 w-24 text-[oklch(0.85_0.18_195)/20]" />
                    </div>
                  )}
                </div>

                {/* Content Block */}
                <div className={isEven ? "order-2" : "order-2 lg:order-1"}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.85_0.18_195)/10]">
                      <Icon className="h-5 w-5 text-[oklch(0.85_0.18_195)]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[oklch(0.85_0.18_195)]">
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
                        <CheckCircle2 className="h-4 w-4 text-[oklch(0.85_0.18_195)] mt-0.5 shrink-0" />
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
                      className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)]"
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.18_195)] mb-3">
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
              className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] btn-cyan-glow"
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
