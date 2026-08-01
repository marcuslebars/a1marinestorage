// A1 Marine Storage — Privacy Policy
// Working template supplied by the owner (to be legally reviewed). Bracketed
// values filled from repo/config where findable; [BUSINESS LEGAL NAME] is left
// bracketed (not in the repo) and flagged. Contact email/phone come from BUSINESS.
import { type ReactNode } from "react";
import { BUSINESS } from "@/content/business";
import { trackPhoneClick } from "@/lib/analytics";

const LAST_UPDATED = "August 1, 2026"; // creation date — update on legal review
const ADDRESS = "639 Concession Road 16 East, Tiny, ON L9M 1R2";

const emailLink = (
  <a href={BUSINESS.emailHref} className="text-[oklch(0.85_0.18_195)] hover:underline">
    {BUSINESS.email}
  </a>
);

const sections: { title: string; body: ReactNode }[] = [
  {
    title: "What we collect",
    body:
      "When you request a quote or submit our contact/request form, we collect the information you provide: your name, phone number, email address, address, and details about your boat and the services you're interested in. When you book and pay, payment is processed by our booking and payment providers; we do not store your full payment card details on this website.",
  },
  {
    title: "How we use it",
    body:
      "We use your information to prepare quotes, schedule and deliver services, process payments, and communicate with you about your booking. If you consent to receive marketing from us, we may send occasional service reminders and seasonal offers; every marketing email includes an unsubscribe link, and we honour unsubscribe requests promptly in accordance with Canada's Anti-Spam Legislation (CASL).",
  },
  {
    title: "Analytics",
    body:
      "We use Google Analytics to understand how visitors use our site (pages visited, quote tool usage, approximate location). This involves cookies and similar technologies. The analytics data we work with is aggregated and does not include the personal details from your form submissions. You can opt out of Google Analytics using Google's browser opt-out tools.",
  },
  {
    title: "Advertising",
    body:
      "We may use Google Ads conversion tracking to measure whether our advertising leads to quote requests. This uses cookies to connect an ad click to a later action on our site.",
  },
  {
    title: "Who we share it with",
    body:
      "Your information is shared only with the service providers that make our business run — our booking/CRM platform, payment processor, and analytics providers — and only for the purposes above. We do not sell your personal information.",
  },
  {
    title: "Retention",
    body:
      "We keep customer and booking records as long as needed to serve you and to meet legal and accounting requirements.",
  },
  {
    title: "Your choices",
    body: (
      <>
        You may ask us to access, correct, or delete your personal information, or withdraw marketing consent, by contacting us
        at {emailLink}. We comply with the Personal Information Protection and Electronic Documents Act (PIPEDA).
      </>
    ),
  },
  {
    title: "Contact",
    body: (
      <>
        [BUSINESS LEGAL NAME], {ADDRESS}, {emailLink},{" "}
        <a
          href={BUSINESS.phoneHref}
          onClick={() => trackPhoneClick("privacy")}
          className="text-[oklch(0.85_0.18_195)] hover:underline"
        >
          {BUSINESS.phone}
        </a>
        .
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Hero */}
      <section className="relative pt-32 pb-12 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-[oklch(0.12_0.018_240)]" />
        <div className="container max-w-3xl mx-auto relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.18_195)] mb-4">Legal</p>
          <h1 className="text-4xl font-black text-white md:text-5xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Privacy Policy
          </h1>
          <p className="mt-4 text-base text-white/60">
            A1 Marine Storage ("we", "us") — last updated {LAST_UPDATED}.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="section-space">
        <div className="container max-w-3xl mx-auto">
          <div className="marine-card p-6 md:p-10 space-y-8">
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
