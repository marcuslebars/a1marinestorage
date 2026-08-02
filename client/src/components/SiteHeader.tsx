// A1 Marine Storage — SiteHeader
// Style: Contemporary Coastal Modernism — dark harbor, red accents, sticky nav with backdrop blur
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/calculator", label: "Get a Quote" },
  { href: "/facility", label: "Facility" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-[oklch(0.12_0.018_240)]/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 shrink-0">
          <img
            src="/a1-marine-storage-logo.png"
            alt="A1 Marine Storage"
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((item) => {
            const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors duration-200 hover:text-[oklch(0.6_0.2_27)]",
                  isActive
                    ? "text-[oklch(0.6_0.2_27)]"
                    : "text-white/70"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:block shrink-0">
          <Button
            size="sm"
            asChild
            className="bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.53_0.2_27)] btn-brand-glow active:scale-[0.97] transition-all duration-150"
          >
            <Link href="/calculator">Get Storage Quote</Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          className="inline-flex md:hidden text-white/80 hover:text-white transition-colors"
          aria-label="Toggle menu"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t border-white/10 bg-[oklch(0.12_0.018_240)]/98 backdrop-blur-xl md:hidden">
          <nav className="container flex flex-col gap-1 py-4 max-w-7xl mx-auto">
            {navLinks.map((item) => {
              const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "text-[oklch(0.6_0.2_27)] bg-white/5"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 pt-2 border-t border-white/10">
              <Button
                asChild
                className="w-full bg-[oklch(0.6_0.2_27)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.53_0.2_27)]"
              >
                <Link href="/calculator">Get Storage Quote</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
