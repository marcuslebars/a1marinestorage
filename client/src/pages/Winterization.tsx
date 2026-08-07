// A1 Marine Storage — Boat Winterization (/winterization)
// Keyword-targeted service page. Prices engine-derived via storage-pricing.ts.
import { Wrench } from "lucide-react";
import { ServicePageLayout } from "@/components/ServicePageLayout";
import { WINTERIZATION, RATES } from "@/lib/storage-pricing";

export default function Winterization() {
  return (
    <ServicePageLayout
      icon={Wrench}
      eyebrow="Boat Winterization"
      h1="Boat Winterization in Tiny, Ontario"
      lede="Engine fogging, antifreeze through the lines, fuel stabilizer, and battery care — done right so a hard freeze doesn't crack a block or split a hose."
      intro={
        <>
          <p>
            Water left in an engine, outdrive, or plumbing line expands when it freezes, and a single hard Georgian Bay
            cold snap is enough to crack a block, split a manifold, or burst a hose. Winterizing removes that risk. We
            flush and fog the engine, push non-toxic antifreeze through the cooling system and onboard water lines, add
            fuel stabilizer, and disconnect the battery so your boat comes out of storage the way it went in.
          </p>
          <p>
            The exact steps depend on your engine — outboard, sterndrive, or inboard — and we price each accordingly,
            with a reduced rate for every additional engine on twin- and triple-rigged boats. Tell us about every onboard
            water system (heads, water heaters, washdowns, ballast, air conditioning) so nothing gets missed; freeze
            damage to a system we weren't told about is the one thing winterizing can't prevent.
          </p>
          <p>
            Winterizing pairs with outdoor storage and shrink wrapping for complete off-season protection, and in spring
            we can commission the boat — reconnect and test the battery, check fluids and systems, and run the engine up
            to temperature — so it's launch-ready. Bundle storage, wrap, and winterizing to save on the whole package.
          </p>
        </>
      }
      includes={[
        { title: "Engine flush & fogging", desc: "Cooling system flushed and internals fogged to prevent corrosion over the off-season." },
        { title: "Antifreeze in engine & lines", desc: "Non-toxic antifreeze run through the cooling system and onboard water lines." },
        { title: "Fuel stabilizer", desc: "Stabilizer added so fuel doesn't gum up over months of storage." },
        { title: "Battery disconnect", desc: "Battery disconnected (and optionally stored indoors) to hold charge and prevent drain." },
        { title: "Drain plug removed", desc: "Drain plug pulled so any residual water can escape rather than freeze." },
        { title: "Priced by engine type", desc: "Outboard, sterndrive, and inboard each priced correctly for the work involved." },
        { title: "Multi-engine friendly", desc: "A reduced rate for each additional engine on twin- and triple-rigged boats." },
        { title: "Spring commissioning", desc: "De-winterize, reconnect and test the battery, check systems, and run to temperature in spring." },
      ]}
      pricingHeading="Winterization pricing"
      pricingIntro="Winterization is a flat rate by engine type, with a reduced rate for each additional engine. Spring commissioning is a separate flat service."
      pricing={
        <div className="marine-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="p-4 font-semibold">Engine type</th>
                  <th className="p-4 font-semibold">Winterization</th>
                  <th className="p-4 font-semibold">Each add'l engine</th>
                </tr>
              </thead>
              <tbody>
                {WINTERIZATION.map((w) => (
                  <tr key={w.engine} className="border-b border-white/5 last:border-0">
                    <td className="p-4 text-white/80">{w.label}</td>
                    <td className="p-4 font-semibold text-white tabular-nums">{w.price}</td>
                    <td className="p-4 text-white/70 tabular-nums">{w.additional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 text-sm text-white/55 border-t border-white/10">
            <p>
              Spring commissioning: <span className="text-white/80 tabular-nums">{RATES.springCommissioning} flat</span>.
            </p>
          </div>
        </div>
      }
      related={[
        { href: "/boat-storage", label: "Outdoor Storage", desc: "Secure, fenced seasonal storage on our Tiny, ON lot." },
        { href: "/shrink-wrapping", label: "Shrink Wrapping", desc: "Vented heat-shrink covers that shed snow all winter." },
        { href: "/pricing", label: "See All Pricing", desc: "Full rates, seasonal bundles, and a worked example." },
      ]}
    />
  );
}
