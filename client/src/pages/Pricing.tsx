// A1 Marine Storage — Pricing Page
// Copy source: docs/a1-storage-pricing-page-copy.md (v1.1.0 rates).
// Every price on this page is derived from the shared @a1/pricing-engine via
// client/src/lib/storage-pricing.ts — never hardcoded — so the next rate change
// updates this page automatically and it can never contradict the calculator.
// SEO: "boat storage pricing Ontario", "shrink wrapping cost per foot", "boat winterization price Georgian Bay"
import { Link } from "wouter";
import { ArrowRight, Info, Shield, Snowflake, Wrench, Anchor, Sun, Sparkles, BatteryCharging, Truck, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  RATES,
  WINTERIZATION,
  BUNDLE_PCT,
  WRAP_REMOVAL,
  perFootBrackets,
  workedExample,
} from "@/lib/storage-pricing";

function RateTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto marine-card p-1">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/15">
            {columns.map((c, i) => (
              <th
                key={c}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[oklch(0.6_0.2_27)] ${
                  i === 0 ? "" : "text-right"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-white/5 last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-3 text-sm ${
                    j === 0 ? "font-medium text-white/80" : "text-right tabular-nums text-white"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuoteCTA({ position, label = "Get My Instant Quote" }: { position: "hero" | "bottom"; label?: string }) {
  return (
    <Button
      asChild
      size="lg"
      className="h-14 px-10 text-base font-semibold bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow active:scale-[0.97] transition-all duration-150"
    >
      <Link href="/calculator" onClick={() => track("quote_cta_click", { position })}>
        {label}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Link>
    </Button>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  rate,
}: {
  icon: typeof Shield;
  title: string;
  rate: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.6_0.2_27)/10]">
          <Icon className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
        </div>
        <h2 className="text-3xl font-black text-white md:text-4xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {title}
        </h2>
      </div>
      <span className="rounded-full bg-[oklch(0.6_0.2_27)/12] px-3 py-1 text-sm font-bold text-[oklch(0.6_0.2_27)] tabular-nums">
        {rate}
      </span>
    </div>
  );
}

export default function Pricing() {
  const outdoorRows = perFootBrackets("outdoor_storage").map((b) => [b.length, b.rate]);
  const shrinkRows = perFootBrackets("shrink_wrap").map((b) => [b.length, b.rate]);
  const winterRows = WINTERIZATION.map((w) => [w.label, w.price, `+${w.additional}`]);
  const bundleRows: string[][] = [
    ["Winter Ready", "Storage + Shrink Wrap", `${BUNDLE_PCT.winterReady}%`],
    ["Winter Ready Plus", "Storage + Shrink Wrap + Winterization", `${BUNDLE_PCT.winterReadyPlus}%`],
    ["Full Care", "Storage + Wrap + Winterization + Fall Detail + Spring Commissioning", `${BUNDLE_PCT.fullCare}%`],
  ];
  const ex = workedExample();

  const addons = [
    {
      id: "spring-commissioning",
      icon: Anchor,
      title: "Spring Commissioning",
      rate: RATES.springCommissioning,
      body: "Full spring start-up so your boat is ready for launch day: de-winterization, battery reconnect and test, fluid and belt checks, systems verification, and an engine run to operating temperature. From winter storage to Georgian Bay without lifting a finger.",
    },
    {
      id: "battery-storage",
      icon: BatteryCharging,
      title: "Battery Storage & Charging",
      rate: `${RATES.batteryPerUnit}/battery`,
      body: `Don't let winter kill your batteries. We remove them, store them indoors, keep them on maintenance charging all season, and reinstall them in spring — so launch day starts on the first turn of the key. ${RATES.batteryPerUnit} per battery, per season.`,
    },
    {
      id: "trailer-storage",
      icon: Truck,
      title: "Trailer Storage",
      rate: RATES.trailer,
      body: `Room for the trailer too. Store your trailer in our yard for the season — with your boat or on its own — and skip the driveway Tetris. Flat ${RATES.trailer} per season.`,
    },
    {
      id: "spring-wrap-removal",
      icon: Scissors,
      title: "Spring Wrap Removal & Disposal",
      rate: `from ${WRAP_REMOVAL.lower}`,
      body: `When spring comes, we uncover, dismantle the frame, and dispose of the wrap properly — no spring Saturday lost to a utility knife and a trailer full of plastic. ${WRAP_REMOVAL.lower} for boats up to ${WRAP_REMOVAL.breakpointFt} ft, ${WRAP_REMOVAL.upper} for ${WRAP_REMOVAL.breakpointFt + 1} ft and over.`,
    },
    {
      id: "fall-detail",
      icon: Sun,
      title: "Fall Detail",
      rate: `${RATES.fallDetailPerFoot}/ft`,
      body: "End-of-season exterior wash and detail before wrapping: hull and topsides cleaned, scum line and waterline staining removed, surfaces protected so contaminants don't bake in over winter. Boats stored clean launch clean.",
    },
    {
      id: "winter-ceramic-coating-upgrade",
      icon: Sparkles,
      title: "Winter Ceramic Coating Upgrade",
      rate: `${RATES.ceramicPerFoot}/ft`,
      body: "Turn storage season into an upgrade. While your boat is in our yard, our A1 Marine Care coating specialists apply a professional ceramic coating — deep gloss, UV protection, and a hull that sheds grime all summer. Winter is the ideal install window: controlled conditions, full cure before launch, zero boating days lost.",
    },
  ];

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-4xl mx-auto relative z-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-4">
            Transparent Pricing
          </p>
          <h1 className="text-5xl font-black text-white md:text-6xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Straightforward storage pricing.<br />No surprises in spring.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base text-white/60 md:text-lg">
            Every price below is the real number — calculated per foot, the same math our instant quote tool uses. Build your
            exact quote in under a minute, or read on for the full breakdown.
          </p>
          <div className="mt-8 flex justify-center">
            <QuoteCTA position="hero" />
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <Info className="h-4 w-4 text-[oklch(0.6_0.2_27)]" />
            <p className="text-sm text-white/60">All prices in CAD. HST applies.</p>
          </div>
        </div>
      </section>

      {/* Outdoor Winter Storage */}
      <section className="section-space">
        <div className="container max-w-4xl mx-auto">
          <SectionHeading icon={Shield} title="Outdoor Winter Storage" rate={`${RATES.outdoorPerFoot}/ft`} />
          <p className="text-base text-white/65 leading-relaxed mb-6 max-w-2xl">
            Secure seasonal storage at our Tiny, ON yard, October through April — minutes from Georgian Bay. Your boat is
            professionally positioned on its trailer or stand with planned spring access, monitored throughout the winter.
          </p>
          <RateTable columns={["Boat length", "Season rate"]} rows={outdoorRows} />
          <p className="mt-3 text-sm text-white/45">
            Minimum {RATES.outdoorMin}. Boats over 32 ft priced individually — use the quote tool or call.
          </p>
        </div>
      </section>

      {/* Shrink Wrapping */}
      <section className="section-space bg-black border-t border-white/10">
        <div className="container max-w-4xl mx-auto">
          <SectionHeading icon={Snowflake} title="Shrink Wrapping" rate={`${RATES.shrinkPerFoot}/ft`} />
          <p className="text-base text-white/65 leading-relaxed mb-6 max-w-2xl">
            Professional-grade shrink wrap with a full support frame, taut welded seams, and proper venting to prevent moisture
            and mildew. Protects your gelcoat, upholstery, and electronics from snow load, ice, and UV.
          </p>
          <RateTable columns={["Boat length", "Rate"]} rows={shrinkRows} />
          <p className="mt-3 text-sm text-white/45">
            Minimum {RATES.shrinkMin}. Pontoon +{RATES.pontoonSurcharge}/ft, tritoon +{RATES.tritoonSurcharge}/ft for additional
            framing and material.
          </p>
          <p className="mt-1 text-sm text-white/45">Spring removal available — see Spring Wrap Removal below.</p>
        </div>
      </section>

      {/* Winterization */}
      <section className="section-space">
        <div className="container max-w-4xl mx-auto">
          <SectionHeading icon={Wrench} title="Winterization" rate="flat rate by engine type" />
          <p className="text-base text-white/65 leading-relaxed mb-6 max-w-2xl">
            Complete freeze protection: engine fogged, fuel stabilized, cooling systems drained and protected with marine
            antifreeze, batteries prepped for storage. Done right in fall means started easy in spring.
          </p>
          <RateTable columns={["Engine type", "Price", "Each additional engine"]} rows={winterRows} />
        </div>
      </section>

      {/* Seasonal add-ons: Spring Commissioning / Fall Detail / Ceramic */}
      <section className="section-space bg-black border-t border-white/10">
        <div className="container max-w-6xl mx-auto">
          <div className="grid gap-5 md:grid-cols-3">
            {addons.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} id={a.id} className="marine-card p-6 flex flex-col scroll-mt-24">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[oklch(0.6_0.2_27)/10]">
                      <Icon className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
                    </div>
                    <span className="text-xl font-black text-[oklch(0.6_0.2_27)] tabular-nums" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {a.rate}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{a.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{a.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bundle & Save */}
      <section className="section-space border-t border-white/10">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">Bundle &amp; Save</p>
            <h2 className="text-4xl font-black text-white md:text-5xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Winter Ready Packages
            </h2>
            <p className="mt-4 text-base text-white/60 max-w-xl mx-auto">
              Book your winter services together and save on the whole package.
            </p>
          </div>
          <RateTable columns={["Package", "Includes", "Savings"]} rows={bundleRows} />

          {/* Worked example — produced by the engine's quote function */}
          <div className="marine-card mt-6 p-5 flex items-start gap-3">
            <Info className="h-4 w-4 text-[oklch(0.6_0.2_27)] mt-0.5 shrink-0" />
            <p className="text-sm text-white/70 leading-relaxed">
              <span className="font-semibold text-white">Example:</span> a {ex.lengthFt} ft sterndrive with storage, wrap, and
              winterization is <span className="font-semibold text-white tabular-nums">{ex.aLaCarte}</span> à la carte —{" "}
              <span className="font-semibold text-[oklch(0.6_0.2_27)] tabular-nums">{ex.bundled}</span> with Winter Ready Plus.
            </p>
          </div>

          <p className="mt-6 text-base text-white/65 leading-relaxed max-w-2xl mx-auto text-center">
            <span className="font-semibold text-white">Full Care is the whole year, handled:</span> your boat leaves the water in
            fall and returns in spring detailed, protected, and running — one booking, one discount, zero hassle.
          </p>
        </div>
      </section>

      {/* Fine print */}
      <section className="py-12 bg-black border-t border-white/10">
        <div className="container max-w-4xl mx-auto">
          <div className="marine-card p-6 md:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/70 mb-4">The fine print</h3>
            <ul className="space-y-3 text-sm text-white/60">
              {[
                "All prices in CAD. HST applies.",
                "Per-foot rates use overall boat length including swim platform and bow pulpit.",
                "Storage season runs October–April; early drop-off and late pickup by arrangement.",
                "Full payment at booking secures your slot — yard capacity is limited and fills before freeze-up.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="text-[oklch(0.6_0.2_27)] font-bold shrink-0">•</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Repeat CTA */}
      <section className="section-space border-t border-white/10">
        <div className="container max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white md:text-5xl mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Build your exact quote
          </h2>
          <p className="text-base text-white/55 max-w-xl mx-auto mb-8">
            Pick your boat, choose your services, and see your real price instantly — the same per-foot math shown above.
          </p>
          <div className="flex justify-center">
            <QuoteCTA position="bottom" />
          </div>
        </div>
      </section>
    </div>
  );
}
