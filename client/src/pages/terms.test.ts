// /terms is no longer a local page — it 301s to the canonical A1 Marine terms
// (https://a1marine.ca/terms), in both the production Express server and the
// dev server (parity). The booking-consent links stay, pointing at /terms, and
// now resolve through that redirect as real anchors (full navigation), never a
// client-side bounce. Source assertions (repo runs vitest in node, no DOM); the
// live 301 + Location header is verified with curl at review time.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderSitemap } from "@shared/seo";

const here = dirname(fileURLToPath(import.meta.url)); // client/src/pages
const read = (rel: string) => readFileSync(join(here, rel), "utf8");

const CANONICAL = "https://a1marine.ca/terms";

describe("/terms — 301 redirect to the canonical A1 Marine terms", () => {
  it("301s /terms to the canonical URL in the Express (production) server", () => {
    const server = read("../../../server/index.ts");
    expect(server).toContain('"/terms"');
    expect(server).toContain("301");
    expect(server).toContain(CANONICAL);
  });

  it("mirrors the redirect in the dev server (no dead page in `pnpm dev`)", () => {
    const vite = read("../../../vite.config.ts");
    expect(vite).toContain('"/terms"');
    expect(vite).toContain(CANONICAL);
  });

  it("ships no local Terms page or SPA route", () => {
    expect(existsSync(join(here, "Terms.tsx"))).toBe(false);
    const app = read("../App.tsx");
    expect(app).not.toContain("pages/Terms");
    expect(app).not.toContain('path="/terms"');
  });

  it("keeps the booking-consent link at the quote flow (real anchor → 301)", () => {
    const calc = read("Calculator.tsx");
    expect(calc).toContain("By booking, you agree to our");
    expect(calc).toContain('href="/terms"');
    // Must be a full navigation, not a wouter client-side Link (which would bounce).
    expect(calc).not.toContain('<Link href="/terms"');
  });

  it("keeps the booking-consent link at the contact/request form (real anchor → 301)", () => {
    const contact = read("Contact.tsx");
    expect(contact).toContain("By booking, you agree to our");
    expect(contact).toContain('href="/terms"');
    expect(contact).not.toContain('<Link href="/terms"');
  });

  it("drops /terms from the sitemap but keeps the site-specific /privacy", () => {
    // Asserted against renderSitemap(), not a file. This read
    // client/public/sitemap.xml until that file was removed as cruft — the
    // sitemap is generated from the shared SEO registry and served by Express,
    // which declares the route BEFORE the static handler so a stale physical
    // file could never win anyway. The test kept reading the deleted path and
    // failed on ENOENT for weeks. Pointing it at the generator makes it assert
    // what is actually served.
    const sitemap = renderSitemap();
    expect(sitemap).not.toContain("/terms");
    expect(sitemap).toContain("/privacy");
  });

  it("still serves a sitemap with real entries", () => {
    // Guards the fix above: an empty or malformed sitemap would satisfy
    // "does not contain /terms" while being completely broken.
    const sitemap = renderSitemap();
    expect(sitemap).toContain("<urlset");
    expect(sitemap.match(/<loc>/g)?.length ?? 0).toBeGreaterThan(5);
    expect(sitemap).toContain("https://a1marinestorage.ca/");
  });
});
