// A1 Marine Storage — SiteFooter
// Style: Dark harbor, cross-links to A1 Marine Care, structured columns
import { Link } from "wouter";
import { MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react";
import { trackPhoneClick } from "@/lib/analytics";

const serviceLinks = [
  { href: "/boat-storage", label: "Outdoor Storage" },
  { href: "/shrink-wrapping", label: "Shrink Wrapping" },
  { href: "/winterization", label: "Winterization" },
  { href: "/services#spring-launch", label: "Spring Commissioning" },
  { href: "/pricing#battery-storage", label: "Battery Storage" },
  { href: "/pricing#trailer-storage", label: "Trailer Storage" },
  { href: "/pricing#spring-wrap-removal", label: "Spring Wrap Removal" },
];

const pageLinks: { href: string; label: string; external?: boolean }[] = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/calculator", label: "Storage Calculator" },
  { href: "/facility", label: "Our Facility" },
  { href: "/contact", label: "Contact Us" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy Policy" },
  // /terms is a server-side 301 to a1marine.ca/terms — render as a real anchor
  // (full navigation) so it hits the redirect instead of client-side routing.
  { href: "/terms", label: "Terms of Service", external: true },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <div className="container max-w-7xl mx-auto py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <img
                src="/a1-marine-storage-logo-dark.png"
                alt="A1 Marine Storage"
                className="h-12 w-auto"
              />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Secure seasonal storage and professional shrink wrapping for boat owners across Georgian Bay and Lake Simcoe.
            </p>
            {/* Sister company link */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-400 mb-1.5">Part of the A1 Marine family</p>
              <a
                href="https://a1marinecare.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[oklch(0.6_0.2_27)] hover:text-[oklch(0.53_0.2_27)] transition-colors"
              >
                Visit A1 Marine Care
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="text-xs text-slate-500 mt-1">Detailing & Ceramic Coating</p>
            </div>
          </div>

          {/* Services Column */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-white mb-4">Services</p>
            <ul className="space-y-2">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-[oklch(0.6_0.2_27)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pages Column */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-white mb-4">Quick Links</p>
            <ul className="space-y-2">
              {pageLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-[oklch(0.6_0.2_27)] transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-[oklch(0.6_0.2_27)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-white mb-4">Contact</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-[oklch(0.6_0.2_27)] mt-0.5 shrink-0" />
                <span className="text-sm text-slate-400">
                  639 Concession Road 16 East<br />
                  Tiny, ON L9M 1R2
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-[oklch(0.6_0.2_27)] shrink-0" />
                <a
                  href="tel:+12492016677"
                  onClick={() => trackPhoneClick("footer")}
                  className="text-sm text-slate-400 hover:text-[oklch(0.6_0.2_27)] transition-colors"
                >
                  (249) 201-6677
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-[oklch(0.6_0.2_27)] shrink-0" />
                <a
                  href="mailto:contact@a1marinestorage.ca"
                  className="text-sm text-slate-400 hover:text-[oklch(0.6_0.2_27)] transition-colors"
                >
                  contact@a1marinestorage.ca
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-[oklch(0.6_0.2_27)] mt-0.5 shrink-0" />
                <div className="text-sm text-slate-400">
                  Mon–Fri: 9am – 6pm<br />
                  By appointment only
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} A1 Marine Storage. All rights reserved. | Tiny, Ontario</p>
          <p className="text-xs">
            Serving Tiny · Midland · Penetanguishene · Wasaga Beach · Georgian Bay · Lake Simcoe
          </p>
        </div>
      </div>
    </footer>
  );
}
