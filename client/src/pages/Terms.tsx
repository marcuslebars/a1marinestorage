// A1 Marine Storage — Terms of Service
// Working template supplied by the owner (to be legally reviewed). Mirrors the
// Privacy page's structure/typography. Bracketed values filled from repo/config
// where findable (legal name via BUSINESS.legalName, address, contacts). The two
// owner-decision clauses (cancellation §3, holdover §10) were confirmed by the
// owner on 2026-08-04; the proposed defaults are retained.
import { type ReactNode } from "react";
import { BUSINESS } from "@/content/business";
import { trackPhoneClick } from "@/lib/analytics";

const LEGAL_NAME = BUSINESS.legalName; // Thinker Holdings Inc.
const LAST_UPDATED = "August 4, 2026";
const ADDRESS = "639 Concession Road 16 East, Tiny, ON L9M 1R2";

const INTRO =
  `These terms apply to seasonal storage, shrink wrapping, winterization, and related services booked with us. ` +
  `By booking and paying for services, you ("the Owner") agree to these terms.`;

const emailLink = (
  <a href={BUSINESS.emailHref} className="text-[oklch(0.6_0.2_27)] hover:underline">
    {BUSINESS.email}
  </a>
);

const sections: { title: string; body: ReactNode }[] = [
  {
    title: "1. Services and season",
    body:
      "The storage season runs from October 1 to April 30 unless otherwise arranged in writing. Services are as described in your quote and booking confirmation. Early drop-off and late pickup are by arrangement and may carry additional charges.",
  },
  {
    title: "2. Payment",
    body:
      "Full payment is due at booking and secures your spot. Prices are in Canadian dollars; HST applies. Quoted prices are based on the boat length and details you provide — if the boat differs materially on arrival (length, type, engine configuration), we will adjust the price to our published rates before services proceed.",
  },
  {
    title: "3. Cancellation and refunds",
    body:
      "Cancellations 14 or more days before your scheduled drop-off receive a full refund less a $100 administration fee. Cancellations within 14 days of drop-off receive a 50% refund. No refund after the boat is in our care or after wrapping/winterization has been performed. Storage fees are not prorated for early pickup.",
  },
  {
    title: "4. Insurance — your boat remains yours to insure",
    body:
      "Storage, wrapping, and winterization fees are not insurance. The Owner must maintain their own comprehensive insurance covering the boat, trailer, and contents for the full storage period, including fire, theft, vandalism, weather, and collision. A1's premises and operations insurance does not cover the Owner's property. We may require proof of insurance before accepting a boat.",
  },
  {
    title: "5. Limitation of liability",
    body:
      "We take reasonable care of every boat in the yard. However, to the maximum extent permitted by law, A1 is not liable for damage arising from weather events (including snow load, ice, and wind), animals or pests, deterioration of covers or wrap over time, pre-existing conditions, mechanical or electrical failure, freezing where winterization was declined or where systems or defects were not disclosed to us, or theft or vandalism. Our total liability for any claim is limited to the amount paid for the season's services. Nothing in these terms limits liability that cannot be limited under Ontario law.",
  },
  {
    title: "6. Winterization scope and disclosure",
    body:
      "Winterization covers the systems identified in the service description for your engine type. The Owner is responsible for disclosing all onboard water systems (heads, water heaters, washdowns, ballast, air conditioning, etc.) and any known engine or cooling-system defects. We are not responsible for freeze damage to systems not disclosed to us or services not booked.",
  },
  {
    title: "7. Shrink wrap",
    body:
      "Wrap is a weather-protection measure, not a sealed or guaranteed environment. We install with support framing and venting to industry practice. Minor wrap damage from severe weather may occur; we will make reasonable repairs to wrap we installed at no charge during the season when notified. Wrap removal in spring is a separate service unless included in your booking.",
  },
  {
    title: "8. Access",
    body:
      "Yard access is by appointment only. The Owner may not perform work on the boat in the yard without our written permission. We may move boats and trailers within the yard for yard management, snow clearing, and access.",
  },
  {
    title: "9. Fuel, batteries, and hazardous items",
    body:
      "Boats must be stored with fuel systems in safe condition. No propane cylinders, portable fuel containers, firearms, or hazardous materials may be left aboard. Batteries left aboard (outside our battery storage service) are at the Owner's risk.",
  },
  {
    title: "10. Pickup, holdover, and abandonment",
    body:
      "Boats must be picked up by the end of the season term unless summer arrangements are made. Boats remaining after May 31 without arrangement incur holdover charges of $25/day. Unpaid accounts and unclaimed boats are subject to our rights under Ontario's Repair and Storage Liens Act, including lien, and after the statutory process, sale of the boat to recover amounts owing.",
  },
  {
    title: "11. Trailers",
    body:
      "Trailer storage booked as a service is subject to these same terms. Trailers must be roadworthy enough to move within the yard; we may move them as needed.",
  },
  {
    title: "12. Our right to refuse or terminate",
    body:
      "We may decline any boat at drop-off that materially differs from the booking or presents a safety concern, with a refund of unperformed services. We may terminate services for non-payment or breach of these terms on written notice.",
  },
  {
    title: "13. General",
    body:
      "These terms are the entire agreement for the services, are governed by the laws of Ontario, and any disputes will be resolved in Ontario. If any clause is unenforceable, the rest remain in effect. We may update these terms for future seasons; the version in effect at your booking governs that season.",
  },
  {
    title: "Contact",
    body: (
      <>
        {LEGAL_NAME}, {ADDRESS}, {emailLink},{" "}
        <a
          href={BUSINESS.phoneHref}
          onClick={() => trackPhoneClick("terms")}
          className="text-[oklch(0.6_0.2_27)] hover:underline"
        >
          {BUSINESS.phone}
        </a>
        .
      </>
    ),
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Hero */}
      <section className="relative pt-32 pb-12 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-3xl mx-auto relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-4">Legal</p>
          <h1 className="text-4xl font-black text-white md:text-5xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Terms of Service
          </h1>
          <p className="mt-4 text-base text-white/60">
            {LEGAL_NAME} operating as A1 Marine Storage ("A1", "we", "us"), {ADDRESS}. Last updated {LAST_UPDATED}.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="section-space">
        <div className="container max-w-3xl mx-auto">
          <div className="marine-card p-6 md:p-10 space-y-8">
            <p className="text-base text-white/65 leading-relaxed">{INTRO}</p>
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {s.title}
                </h2>
                <p className="text-base text-white/65 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
