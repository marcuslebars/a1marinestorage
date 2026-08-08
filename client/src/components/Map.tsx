// Keyless Google Maps embed — no API key, no third-party proxy, no JS SDK, so it
// renders reliably on any deploy. Replaces the old FrontendForge-proxied interactive
// map (client/src builder scaffold) that needed VITE_FRONTEND_FORGE_API_KEY and showed
// a blank box in production when that key was unset.
import { cn } from "@/lib/utils";

interface MapViewProps {
  className?: string;
  /** Address (or "lat,lng") to center the map on. */
  query?: string;
  /** Accessible iframe title. */
  title?: string;
  /** Map zoom level (1–20). */
  zoom?: number;
}

export function MapView({
  className,
  query = "639 Concession Road 16 East, Tiny, ON L9M 1R2",
  title = "A1 Marine Storage location map",
  zoom = 14,
}: MapViewProps) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;
  return (
    <iframe
      title={title}
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
      className={cn("h-full min-h-[20rem] w-full border-0", className)}
    />
  );
}
