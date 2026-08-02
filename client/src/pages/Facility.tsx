// A1 Marine Storage — Facility / About Page
// SEO: "boat storage facility Tiny Ontario", "indoor boat storage Georgian Bay", "A1 Marine Storage"
import { Link } from "wouter";
import { MapPin, Shield, Camera, Lightbulb, Lock, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const FACILITY_IMG = "/facility-front.jpg"; // real facility — front / drive-up view
const INDOOR_IMG = "/facility-side.jpg"; // real facility — side / lot view

const securityFeatures = [
  {
    icon: Shield,
    title: "Gated & Fenced Property",
    desc: "Fully fenced perimeter with controlled gate access.",
  },
  {
    icon: Camera,
    title: "24/7 Video Surveillance",
    desc: "Security cameras monitoring the facility around the clock.",
  },
  {
    icon: Lock,
    title: "Controlled Access",
    desc: "Entry by appointment or access code during business hours. No unauthorized access to the lot.",
  },
  {
    icon: Lightbulb,
    title: "Well-Lit Facility",
    desc: "Exterior and interior lighting for safe access during early morning or evening hours.",
  },
  {
    icon: MapPin,
    title: "Rural Location",
    desc: "Located on Concession Road 16 East in Tiny Township — low traffic, high visibility, away from urban congestion.",
  },
  {
    icon: Clock,
    title: "Accessible by Appointment",
    desc: "Need to access your boat mid-season? Contact us to arrange access during business hours.",
  },
];

const facilityHighlights = [
  "New construction — clean, modern building and lot",
  "High-ceiling indoor building for tall vessels",
  "Level, well-drained outdoor storage lot",
  "Boats stored on owner's trailer — no lift required",
  "Ample space for maneuvering trailers",
  "Located in Tiny Township, central to Georgian Bay service area",
];

export default function Facility() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Page Hero */}
      <section className="relative pt-0 overflow-hidden">
        <div className="relative h-[60vh] min-h-[400px]">
          <img
            src={FACILITY_IMG}
            alt="A1 Marine Storage facility at 639 Concession Road 16 East, Tiny, Ontario"
            className="absolute inset-0 w-full h-full object-cover object-[center_38%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
          <div className="absolute inset-0 flex items-end pb-12">
            <div className="container max-w-7xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
                Our Facility
              </p>
              <h1
                className="text-5xl font-black text-white md:text-7xl"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                639 Concession Road 16 East
              </h1>
              <p className="mt-2 text-lg text-white/70">Tiny, Ontario — Secure Seasonal Boat Storage</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section-space bg-black border-b border-white/10">
        <div className="container max-w-7xl mx-auto">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
                About the Facility
              </p>
              <h2
                className="text-4xl font-black text-white md:text-5xl mb-6"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                A New Standard for Boat Storage in Georgian Bay
              </h2>
              <p className="text-base text-white/65 leading-relaxed mb-5">
                A1 Marine Storage is the storage and winterizing division of A1 Marine Care — the trusted mobile boat detailing company serving Georgian Bay and Lake Simcoe. Our new facility at 639 Concession Road 16 East in Tiny Township was purpose-built to provide boat owners with a secure, professional alternative to leaving their vessels exposed all winter.
              </p>
              <p className="text-base text-white/65 leading-relaxed mb-6">
                Whether you need indoor storage for maximum protection, outdoor storage combined with professional shrink wrapping, or a complete winterization package, our facility has the space and the expertise to handle it all.
              </p>
              <ul className="space-y-2.5 mb-8">
                {facilityHighlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[oklch(0.6_0.2_27)] mt-0.5 shrink-0" />
                    <span className="text-sm text-white/65">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img
                src={INDOOR_IMG}
                alt="A1 Marine Storage facility — secured lot with drive-up access, Tiny, Ontario"
                className="w-full h-80 object-cover md:h-96"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="section-space bg-[oklch(0.12_0.018_240)]">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
              Your Investment Is Protected
            </p>
            <h2
              className="text-4xl font-black text-white md:text-5xl"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Facility Security
            </h2>
            <p className="mt-4 text-base text-white/55 max-w-xl mx-auto">
              We take the security of your vessel seriously. Here's how we protect your boat all season.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {securityFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="marine-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.6_0.2_27)/10]">
                      <Icon className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">{feature.title}</h3>
                      <p className="text-sm text-white/55 leading-relaxed">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Location & Hours */}
      <section className="section-space bg-black border-t border-white/10">
        <div className="container max-w-7xl mx-auto">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Location Info */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
                Location & Hours
              </p>
              <h2
                className="text-3xl font-black text-white md:text-4xl mb-6"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Find Us in Tiny Township
              </h2>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[oklch(0.6_0.2_27)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">Address</p>
                    <p className="text-sm text-white/60 mt-0.5">
                      639 Concession Road 16 East<br />
                      Tiny, ON L9M 1R2
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-[oklch(0.6_0.2_27)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">Business Hours</p>
                    <div className="text-sm text-white/60 mt-0.5 space-y-0.5">
                      <p>Monday – Friday: 9:00 AM – 6:00 PM</p>
                      <p>By appointment only</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  className="bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow"
                >
                  <Link href="/contact">
                    Contact Us
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 text-white/80 hover:border-white/40 hover:text-white"
                >
                  <a
                    href="https://maps.google.com/?q=639+Concession+Road+16+East+Tiny+ON"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get Directions
                  </a>
                </Button>
              </div>
            </div>

            {/* Facility photo (Google Map needs VITE_FRONTEND_FORGE_API_KEY; photo works without it) */}
            <div className="rounded-2xl overflow-hidden border border-white/10 h-80 md:h-96">
              <img
                src={FACILITY_IMG}
                alt="A1 Marine Storage — 639 Concession Road 16 East, Tiny, Ontario"
                className="w-full h-full object-cover object-[center_40%]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* A1 Marine Care Cross-Link */}
      <section className="py-10 bg-[oklch(0.12_0.018_240)] border-t border-white/10">
        <div className="container max-w-7xl mx-auto">
          <div className="marine-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[oklch(0.6_0.2_27)] mb-2">
                Part of the A1 Marine Family
              </p>
              <h3
                className="text-2xl font-black text-white mb-2"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Also Need Detailing or Ceramic Coating?
              </h3>
              <p className="text-sm text-white/60">
                A1 Marine Care — our sister company — provides premium mobile boat detailing, gelcoat restoration, and ceramic coating across Georgian Bay and Lake Simcoe.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="shrink-0 border-[oklch(0.6_0.2_27)/40] text-[oklch(0.6_0.2_27)] hover:bg-[oklch(0.6_0.2_27)/10]"
            >
              <a href="https://a1marinecare.ca" target="_blank" rel="noopener noreferrer">
                Visit A1 Marine Care
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
