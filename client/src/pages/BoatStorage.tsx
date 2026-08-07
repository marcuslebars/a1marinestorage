// A1 Marine Storage — Outdoor Boat Storage (/boat-storage)
// Keyword-targeted service page ("boat storage Tiny / Georgian Bay"). All prices
// engine-derived via storage-pricing.ts. JSON-LD comes from the SEO registry.
import { Shield } from "lucide-react";
import { ServicePageLayout } from "@/components/ServicePageLayout";
import { AreasWeServe } from "@/components/AreasWeServe";
import { perFootBrackets, RATES } from "@/lib/storage-pricing";

const brackets = perFootBrackets("outdoor_storage");

export default function BoatStorage() {
  return (
    <ServicePageLayout
      icon={Shield}
      eyebrow="Outdoor Boat Storage"
      h1="Outdoor Boat Storage in Tiny, Ontario"
      lede="Secure, gated seasonal storage on our fenced lot minutes from Georgian Bay — your boat professionally blocked on its trailer and watched over all winter."
      intro={
        <>
          <p>
            A1 Marine Storage keeps your boat on a secured, fenced lot at 639 Concession Road 16 East in Tiny — a short
            tow from the launches at Midland, Penetanguishene, and Wasaga Beach. When you haul out in the fall, we
            position and block your boat properly on its own trailer so it sits level and stable through the freeze-thaw
            of a Georgian Bay winter.
          </p>
          <p>
            Outdoor storage is the most economical way to overwinter a trailered boat, and it works best paired with a
            professional shrink wrap that sheds snow and keeps moisture out. The lot has proper drainage, controlled
            entry, and is monitored through the season, so your boat is looked after from last haul-out to spring launch.
          </p>
          <p>
            Pricing is seasonal and per foot — you pay once for the whole winter, with no monthly billing surprises. When
            spring comes we arrange your pickup and can de-winterize and commission the boat so it's ready for the water.
            Reserve early; lot space is limited each year.
          </p>
        </>
      }
      includes={[
        { title: "Secured, fenced lot", desc: "Controlled entry by appointment or access code, with the yard monitored throughout the storage season." },
        { title: "Professionally blocked", desc: "Your boat is levelled and stabilized on its trailer for the freeze-thaw months — not just parked." },
        { title: "Stays on your trailer", desc: "No cradle rental needed; boats overwinter on the owner's own trailer." },
        { title: "Proper drainage", desc: "The lot is graded so meltwater and rain drain away from your hull and trailer." },
        { title: "Seasonal flat pricing", desc: "One per-foot rate for the whole season — no monthly invoices or hidden fees." },
        { title: "Spring access & launch", desc: "Planned spring access, with de-winterizing and commissioning available when you're ready to splash." },
        { title: "Pontoon & tritoon friendly", desc: "We store pontoons and tritoons too, with a small per-foot surcharge for the wider footprint." },
        { title: "Battery & trailer add-ons", desc: "Store loose batteries safely and park a second trailer on site as optional add-ons." },
      ]}
      pricingHeading="Outdoor storage pricing"
      pricingIntro="Storage is priced per foot of overall length with a seasonal minimum. Pontoons and tritoons carry a small per-foot surcharge for the extra footprint."
      pricing={
        <div className="marine-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="p-4 font-semibold">Boat length</th>
                  <th className="p-4 font-semibold">Seasonal storage</th>
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
          <div className="p-4 text-sm text-white/55 space-y-1 border-t border-white/10">
            <p>
              Pontoon surcharge <span className="text-white/80 tabular-nums">{RATES.pontoonSurcharge}/ft</span> · Tritoon{" "}
              <span className="text-white/80 tabular-nums">{RATES.tritoonSurcharge}/ft</span>
            </p>
            <p>
              Add-ons: battery storage <span className="text-white/80 tabular-nums">{RATES.batteryPerUnit}/battery</span> ·
              trailer storage <span className="text-white/80 tabular-nums">{RATES.trailer} flat</span>
            </p>
          </div>
        </div>
      }
      extraSection={<AreasWeServe />}
      related={[
        { href: "/shrink-wrapping", label: "Shrink Wrapping", desc: "Tight, vented heat-shrink cover — pairs perfectly with outdoor storage." },
        { href: "/winterization", label: "Winterization", desc: "Protect your engine and systems from freeze damage over winter." },
        { href: "/pricing", label: "See All Pricing", desc: "Full per-foot rates, seasonal bundles, and a worked example." },
      ]}
    />
  );
}
