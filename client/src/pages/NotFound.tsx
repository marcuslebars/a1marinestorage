// A1 Marine Storage — 404 Not Found Page
// Style: Contemporary Coastal Modernism — dark harbor, cyan accents
import { Link } from "wouter";
import { Anchor, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[oklch(0.85_0.18_195)/10] mx-auto mb-6">
          <Anchor className="h-10 w-10 text-[oklch(0.85_0.18_195)]" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.18_195)] mb-3">
          404 — Page Not Found
        </p>
        <h1
          className="text-5xl font-black text-white mb-4"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Lost at Sea?
        </h1>
        <p className="text-base text-white/60 mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back to shore.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] btn-cyan-glow"
          >
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 text-white/80 hover:border-white/40 hover:text-white"
          >
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
