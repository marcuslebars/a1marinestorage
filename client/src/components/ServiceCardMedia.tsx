// Media for a service card. Shows a real photo when one exists at `src`; otherwise
// (src is null, or the file hasn't been added yet) it renders an on-brand panel so the
// card still looks intentional — never a broken image or an empty box.
//
// PHOTOS: this site uses REAL A1 facility photos only — never external/stock imagery.
// Drop a correctly-named JPG into client/public and set the card's `img` to its path;
// if a wired path 404s, onError falls back to the branded panel automatically.
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

interface ServiceCardMediaProps {
  src?: string | null;
  alt: string;
  Icon: LucideIcon;
  /** "card" = compact homepage grid tile (h-44); "feature" = large Services block (h-72/80). */
  variant?: "card" | "feature";
}

export function ServiceCardMedia({ src, alt, Icon, variant = "card" }: ServiceCardMediaProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  const height = variant === "feature" ? "h-72 md:h-80" : "h-44";
  const chrome = variant === "feature" ? "rounded-2xl border border-white/10" : "";

  return (
    <div className={`relative overflow-hidden ${height} ${chrome}`}>
      {showImage ? (
        <>
          <img
            src={src as string}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover ${
              variant === "card" ? "transition-transform duration-500 group-hover:scale-105" : ""
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.16_0.018_240)] via-transparent to-transparent" />
        </>
      ) : (
        // Branded fallback: deep navy panel, soft red glow, ghosted service icon, wordmark.
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.20_0.02_240)] to-[oklch(0.13_0.015_240)]">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{ background: "radial-gradient(circle at 50% 42%, oklch(0.6 0.2 27), transparent 68%)" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon
              className="text-[oklch(0.6_0.2_27)]"
              style={{ width: variant === "feature" ? "6rem" : "4.5rem", height: variant === "feature" ? "6rem" : "4.5rem", opacity: 0.28 }}
              strokeWidth={1.25}
            />
          </div>
          <div className="absolute inset-x-0 bottom-3 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/25">
              A1 Marine Storage
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
