// A1 Marine Storage — Pricing Page
// SEO: "boat storage pricing Ontario", "shrink wrapping cost per foot", "boat winterization price Georgian Bay"
import { Link } from "wouter";
import { CheckCircle2, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const perFootServices = [
  {
    name: "Shrink Wrapping",
    price: "$X.XX",
    unit: "per foot",
    note: "⚠️ PLACEHOLDER — confirm rate",
    description: "Professional heat-shrink film with ventilation ports. Price based on boat length (LOA).",
    included: ["Commercial-grade white film", "Ventilation ports", "Bottom strapping", "Labour & materials"],
  },
  {
    name: "Indoor Storage",
    price: "$X.XX",
    unit: "per foot / season",
    note: "⚠️ PLACEHOLDER — confirm rate",
    description: "Secure indoor storage in our clean, well-lit building. Priced per foot of boat length, per season.",
    included: ["Fall to spring season", "Blocked & stabilized", "Controlled access", "Video surveillance"],
  },
  {
    name: "Outdoor Storage",
    price: "$X.XX",
    unit: "per foot / season",
    note: "⚠️ PLACEHOLDER — confirm rate",
    description: "Economical outdoor storage on our secured, fenced lot. Ideal when combined with shrink wrapping.",
    included: ["Fall to spring season", "Blocked & stabilized", "Gated lot", "Video surveillance"],
  },
  {
    name: "Spring Shrink Wrap Removal",
    price: "$X.XX",
    unit: "per foot",
    note: "⚠️ PLACEHOLDER — confirm rate",
    description: "Shrink wrap removal and proper disposal. Includes basic spring inspection.",
    included: ["Wrap removal", "Proper disposal", "Visual inspection", "No mess left behind"],
  },
];

const flatFeeServices = [
  {
    name: "Winterization Package",
    price: "$XXX",
    unit: "flat rate",
    note: "⚠️ PLACEHOLDER — confirm price & inclusions",
    description: "Engine flush & fogging, antifreeze, fuel stabilizer, battery disconnect, drain plug removal.",
  },
  {
    name: "Battery Storage",
    price: "$XX",
    unit: "per battery / season",
    note: "⚠️ PLACEHOLDER — confirm rate",
    description: "Battery removed, stored on a trickle charger, and reinstalled in spring.",
  },
  {
    name: "Trailer Storage",
    price: "$XXX",
    unit: "per season",
    note: "⚠️ PLACEHOLDER — confirm rate",
    description: "Seasonal storage for boat trailers and PWCs on our secured outdoor lot.",
  },
];

const bundles = [
  {
    name: "Full Winter Package",
    badge: "Best Value",
    description: "Everything your boat needs for a safe, protected winter — bundled at a discounted rate.",
    includes: [
      "Outdoor storage (per foot, per season)",
      "Professional shrink wrapping",
      "Full winterization package",
      "Spring shrink wrap removal",
    ],
    price: "$X.XX/ft + $XXX",
    note: "⚠️ PLACEHOLDER — confirm bundle pricing",
    highlight: true,
  },
  {
    name: "Storage + Shrink Wrap",
    badge: "Popular",
    description: "Secure outdoor storage with professional shrink wrapping. Perfect for owners who handle their own winterization.",
    includes: [
      "Outdoor storage (per foot, per season)",
      "Professional shrink wrapping",
      "Spring shrink wrap removal",
    ],
    price: "$X.XX/ft",
    note: "⚠️ PLACEHOLDER — confirm bundle pricing",
    highlight: false,
  },
  {
    name: "Indoor Premium Package",
    badge: "Maximum Protection",
    description: "Indoor storage with shrink wrapping for the ultimate off-season protection.",
    includes: [
      "Indoor storage (per foot, per season)",
      "Professional shrink wrapping",
      "Spring shrink wrap removal",
    ],
    price: "$X.XX/ft",
    note: "⚠️ PLACEHOLDER — confirm bundle pricing",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Page Hero */}
      <section className="relative pt-32 pb-16 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-7xl mx-auto relative z-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.18_195)] mb-4">
            Transparent Pricing
          </p>
          <h1
            className="text-5xl font-black text-white md:text-7xl"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Storage & Service Pricing
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base text-white/60 md:text-lg">
            All pricing is "starting at" per foot of boat length (LOA). Final pricing confirmed at quote time based on boat make, model, and configuration.
          </p>
          {/* HST Note */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <Info className="h-4 w-4 text-[oklch(0.85_0.18_195)]" />
            <p className="text-sm text-white/60">All prices are subject to HST (Ontario). HST will be added at invoice.</p>
          </div>
        </div>
      </section>

      {/* Placeholder Warning Banner */}
      <div className="bg-yellow-500/10 border-y border-yellow-500/20 py-3">
        <div className="container max-w-7xl mx-auto">
          <p className="text-center text-sm text-yellow-400/80">
            ⚠️ All prices shown are placeholders. Final pricing will be confirmed by the owner before launch.
          </p>
        </div>
      </div>

      {/* Per-Foot Services */}
      <section className="section-space">
        <div className="container max-w-7xl mx-auto">
          <h2
            className="text-3xl font-black text-white md:text-4xl mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Per-Foot Services
          </h2>
          <p className="text-sm text-white/50 mb-8">Priced per foot of boat length (LOA — Length Overall)</p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {perFootServices.map((service) => (
              <div key={service.name} className="marine-card p-6 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-1">{service.name}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{service.description}</p>
                </div>
                <div className="mt-auto">
                  <div className="mb-4">
                    <span
                      className="text-3xl font-black text-[oklch(0.85_0.18_195)]"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {service.price}
                    </span>
                    <span className="text-sm text-white/40 ml-1">{service.unit}</span>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {service.included.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-white/55">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.85_0.18_195)] shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-yellow-400/60">{service.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flat-Fee Services */}
      <section className="section-space bg-black border-t border-white/10">
        <div className="container max-w-7xl mx-auto">
          <h2
            className="text-3xl font-black text-white md:text-4xl mb-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Flat-Fee Add-Ons
          </h2>
          <p className="text-sm text-white/50 mb-8">Fixed pricing regardless of boat size</p>
          <div className="grid gap-5 md:grid-cols-3">
            {flatFeeServices.map((service) => (
              <div key={service.name} className="marine-card p-6">
                <h3 className="text-lg font-bold text-white mb-2">{service.name}</h3>
                <p className="text-sm text-white/55 leading-relaxed mb-4">{service.description}</p>
                <div className="mt-auto">
                  <span
                    className="text-3xl font-black text-[oklch(0.85_0.18_195)]"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {service.price}
                  </span>
                  <span className="text-sm text-white/40 ml-1">{service.unit}</span>
                  <p className="text-xs text-yellow-400/60 mt-2">{service.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bundle Packages */}
      <section className="section-space bg-[oklch(0.12_0.018_240)] border-t border-white/10">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.18_195)] mb-3">
              Save More
            </p>
            <h2
              className="text-4xl font-black text-white md:text-5xl"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Bundle & Save Packages
            </h2>
            <p className="mt-4 text-base text-white/55 max-w-xl mx-auto">
              Combine services for the best value. Bundle pricing confirmed at quote time.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {bundles.map((bundle) => (
              <div
                key={bundle.name}
                className={`marine-card p-6 flex flex-col relative ${
                  bundle.highlight
                    ? "border-[oklch(0.85_0.18_195)/40] shadow-[0_0_40px_-10px_oklch(0.85_0.18_195/0.3)]"
                    : ""
                }`}
              >
                {bundle.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[oklch(0.85_0.18_195)] px-3 py-1 text-xs font-bold text-[oklch(0.12_0.018_240)] uppercase tracking-wide">
                      {bundle.badge}
                    </span>
                  </div>
                )}
                {!bundle.highlight && (
                  <span className="inline-block rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/60 mb-3 w-fit">
                    {bundle.badge}
                  </span>
                )}
                <h3
                  className="text-xl font-black text-white mb-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {bundle.name}
                </h3>
                <p className="text-sm text-white/55 leading-relaxed mb-5">{bundle.description}</p>
                <ul className="space-y-2 mb-6">
                  {bundle.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-white/65">
                      <CheckCircle2 className="h-4 w-4 text-[oklch(0.85_0.18_195)] mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <div className="mb-1">
                    <span
                      className="text-2xl font-black text-[oklch(0.85_0.18_195)]"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {bundle.price}
                    </span>
                  </div>
                  <p className="text-xs text-yellow-400/60 mb-4">{bundle.note}</p>
                  <Button
                    asChild
                    className={`w-full font-semibold ${
                      bundle.highlight
                        ? "bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.78_0.18_195)] btn-cyan-glow"
                        : "border border-white/20 bg-transparent text-white hover:bg-white/5"
                    }`}
                  >
                    <Link href="/calculator">
                      Get Quote
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Notes */}
      <section className="py-10 bg-black border-t border-white/10">
        <div className="container max-w-7xl mx-auto">
          <div className="marine-card p-6 md:p-8 max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-white mb-4">Pricing Notes</h3>
            <ul className="space-y-3 text-sm text-white/60">
              <li className="flex items-start gap-2.5">
                <span className="text-[oklch(0.85_0.18_195)] font-bold shrink-0">•</span>
                All pricing is "starting at" per foot (LOA — Length Overall). Final pricing confirmed after reviewing boat make, model, and configuration.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[oklch(0.85_0.18_195)] font-bold shrink-0">•</span>
                HST (13%) will be added to all services. Prices shown are before tax.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[oklch(0.85_0.18_195)] font-bold shrink-0">•</span>
                Pricing may vary for pontoon boats, sailboats, and vessels with unusual configurations.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[oklch(0.85_0.18_195)] font-bold shrink-0">•</span>
                Storage season runs from approximately October/November to April/May. Exact dates confirmed at booking.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[oklch(0.85_0.18_195)] font-bold shrink-0">•</span>
                Use our Storage Calculator for an instant estimate, or contact us for a custom quote.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-space bg-[oklch(0.12_0.018_240)] border-t border-white/10">
        <div className="container max-w-7xl mx-auto text-center">
          <h2
            className="text-4xl font-black text-white md:text-5xl mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Get Your Personalized Quote
          </h2>
          <p className="text-base text-white/55 max-w-xl mx-auto mb-8">
            Use our interactive calculator to build your custom storage package and get an instant estimate.
          </p>
          <Button
            asChild
            size="lg"
            className="h-14 px-10 text-base font-semibold bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.78_0.18_195)] btn-cyan-glow active:scale-[0.97] transition-all duration-150"
          >
            <Link href="/calculator">
              Open Storage Calculator
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
