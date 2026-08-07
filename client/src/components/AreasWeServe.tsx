// "Areas we serve" — internal-linking hub to every locality page. Rendered on
// /boat-storage (the service→locality parent) and on each locality page to
// cross-link the set. Data-driven from @shared/localities.
import { Link } from "wouter";
import { MapPin } from "lucide-react";
import { LOCALITIES } from "@shared/localities";

export function AreasWeServe({ currentSlug, heading = "Areas we serve" }: { currentSlug?: string; heading?: string }) {
  const towns = LOCALITIES.filter((l) => l.slug !== currentSlug);
  return (
    <section className="section-space bg-black">
      <div className="container max-w-5xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.6_0.2_27)] mb-3">
          Georgian Bay &amp; Lake Simcoe
        </p>
        <h2 className="text-3xl font-black text-white md:text-4xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {heading}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-white/60 leading-relaxed">
          Secure winter storage, shrink wrapping, and winterization for boat owners across the region — all a short tow
          from our yard at 639 Concession Road 16 East in Tiny, Ontario.
        </p>
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
          {towns.map((l) => (
            <Link
              key={l.slug}
              href={`/boat-storage/${l.slug}`}
              className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white/70 transition-colors hover:border-[oklch(0.6_0.2_27)/40] hover:text-white"
            >
              <MapPin className="h-4 w-4 shrink-0 text-[oklch(0.6_0.2_27)]" />
              Boat Storage in {l.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
