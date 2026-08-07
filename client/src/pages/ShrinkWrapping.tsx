// A1 Marine Storage — Boat Shrink Wrapping (/shrink-wrapping)
// Keyword-targeted service page. Prices engine-derived via storage-pricing.ts.
import { Snowflake } from "lucide-react";
import { ServicePageLayout } from "@/components/ServicePageLayout";
import { perFootBrackets, WRAP_REMOVAL } from "@/lib/storage-pricing";

const brackets = perFootBrackets("shrink_wrap");

export default function ShrinkWrapping() {
  return (
    <ServicePageLayout
      icon={Snowflake}
      eyebrow="Boat Shrink Wrapping"
      h1="Boat Shrink Wrapping in Tiny, Ontario"
      lede="Commercial-grade, vented heat-shrink covers installed tight over a support frame — the winter protection a loose tarp simply can't match."
      intro={
        <>
          <p>
            A professional shrink wrap is the single best thing you can do to protect a boat stored outdoors through a
            Georgian Bay winter. We install commercial-grade, UV-resistant heat-shrink film over a built-up support
            frame, then heat it to a drum-tight seal that sheds snow load and won't flap loose in a January wind the way
            a tarp does.
          </p>
          <p>
            Every wrap gets vented. Sealing a boat up without airflow traps moisture and invites mould and mildew over
            five months of storage, so we install ventilation ports as standard and can add zippered access panels if
            you need to get aboard during the winter. The film covers the whole boat — bow, stern, and every protrusion —
            and is strapped securely along the bottom.
          </p>
          <p>
            Shrink wrapping is priced per foot of overall length with a minimum, and it pairs naturally with our outdoor
            storage. In spring we remove and responsibly dispose of the wrap for you — a separate service unless it's
            included in your booking — so you're not left wrestling a boat-sized sheet of plastic on launch day.
          </p>
        </>
      }
      includes={[
        { title: "Commercial UV-resistant film", desc: "White heat-shrink film that reflects sun and resists tearing — not a hardware-store tarp." },
        { title: "Vented as standard", desc: "Ventilation ports installed to keep air moving and prevent moisture, mould, and mildew." },
        { title: "Built-up support frame", desc: "A framed peak so snow and meltwater run off instead of pooling on the cover." },
        { title: "Full-boat coverage", desc: "Bow, stern, and every protrusion wrapped, with secure bottom strapping." },
        { title: "Zippered access panels", desc: "Optional door/zipper panels so you can get aboard mid-season without cutting the wrap." },
        { title: "In-season wrap repairs", desc: "We'll make reasonable repairs to wrap we installed if severe weather damages it during the season." },
        { title: "Pairs with outdoor storage", desc: "Wrap plus storage is the combination that actually protects a boat all winter." },
        { title: "Spring removal & disposal", desc: "We remove and responsibly dispose of the wrap in spring so you don't have to." },
      ]}
      pricingHeading="Shrink wrapping pricing"
      pricingIntro="Shrink wrapping is priced per foot of overall length with a minimum. Spring wrap removal and disposal is a separate flat service unless it's included in your booking."
      pricing={
        <div className="marine-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="p-4 font-semibold">Boat length</th>
                  <th className="p-4 font-semibold">Shrink wrapping</th>
                </tr>
              </thead>
              <tbody>
                {brackets.map((b) => (
                  <tr key={b.length} className="border-b border-white/5 last:border-0">
                    <td className="p-4 text-white/80">{b.length}</td>
                    <td className="p-4 font-semibold text-white tabular-nums">{b.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 text-sm text-white/55 border-t border-white/10">
            <p>
              Spring wrap removal &amp; disposal:{" "}
              <span className="text-white/80 tabular-nums">{WRAP_REMOVAL.lower}</span> up to {WRAP_REMOVAL.breakpointFt} ft ·{" "}
              <span className="text-white/80 tabular-nums">{WRAP_REMOVAL.upper}</span> for {WRAP_REMOVAL.breakpointFt + 1} ft and up.
            </p>
          </div>
        </div>
      }
      related={[
        { href: "/boat-storage", label: "Outdoor Storage", desc: "Secure, fenced seasonal storage — the natural pairing for a shrink wrap." },
        { href: "/winterization", label: "Winterization", desc: "Protect your engine and plumbing from freeze damage." },
        { href: "/pricing", label: "See All Pricing", desc: "Full per-foot rates, bundles, and a worked example." },
      ]}
    />
  );
}
