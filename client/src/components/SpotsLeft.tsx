// "N spots left for winter 2026–27".
//
// NEVER INVENTED, and never shown unless it is both real and meaningful:
//
//   null           → nothing is seeded, so nothing is said
//   0              → a real answer, but "0 spots left" on a marketing page
//                    reads as "go away"; the yard would rather take the call
//   more than 40   → not scarcity, just noise, and it makes the yard look empty
//
// Renders nothing in every one of those cases. A component that renders
// nothing is the correct output for "we do not know".
import { useEffect, useState } from "react";

/** Matches shouldShowSpotsLeft in server/capacity.ts. */
const MAX_SHOWN = 40;

export function SpotsLeft({ className = "" }: { className?: string }) {
  const [state, setState] = useState<{
    spotsLeft: number | null;
    season: string | null;
  }>({ spotsLeft: null, season: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/capacity");
        const d = (await res.json()) as {
          spotsLeft?: number | null;
          season?: string | null;
        };
        if (!cancelled) {
          setState({
            spotsLeft: d.spotsLeft ?? null,
            season: d.season ?? null,
          });
        }
      } catch {
        /* Silence is the right failure here. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { spotsLeft, season } = state;
  if (
    typeof spotsLeft !== "number" ||
    spotsLeft <= 0 ||
    spotsLeft > MAX_SHOWN
  ) {
    return null;
  }

  // "2026-27" → "2026–27", en dash, the way a season is written.
  const label = season ? season.replace("-", "–") : null;

  return (
    <p
      className={`text-sm font-semibold text-[oklch(0.6_0.2_27)] ${className}`}
    >
      {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
      {label ? ` for winter ${label}` : ""}
    </p>
  );
}
