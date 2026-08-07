// Unit tests for the shared SEO registry (shared/seo.ts). Lives under client/src
// so vitest's include glob picks it up; imports via the @shared alias.
import { describe, it, expect } from "vitest";
import {
  getPageMeta,
  hasPage,
  canonicalUrl,
  normalizePath,
  injectMeta,
  renderSitemap,
  registerPages,
} from "@shared/seo";

const BASE_HTML = [
  "<html><head>",
  "<title>OLD TITLE</title>",
  '<meta name="description" content="old description" />',
  '<link rel="canonical" href="https://a1marinestorage.ca" />',
  '<meta property="og:title" content="old" />',
  '<meta property="og:url" content="old" />',
  '<meta name="twitter:title" content="old" />',
  "</head><body></body></html>",
].join("\n");

describe("SEO registry — getPageMeta", () => {
  it("resolves known routes with unique, per-page titles", () => {
    expect(getPageMeta("/").title).toContain("A1 Marine Storage");
    expect(getPageMeta("/boat-storage").title).toContain("Outdoor Boat Storage");
    expect(getPageMeta("/pricing").title).not.toEqual(getPageMeta("/").title);
    expect(getPageMeta("/shrink-wrapping").description).not.toEqual(getPageMeta("/winterization").description);
  });

  it("homepage carries LocalBusiness + WebSite JSON-LD", () => {
    const types = (getPageMeta("/").jsonLd ?? []).map((o) => (o as Record<string, unknown>)["@type"]);
    expect(types).toContain("LocalBusiness");
    expect(types).toContain("WebSite");
  });

  it("/faq carries FAQPage JSON-LD, service pages carry Service JSON-LD", () => {
    expect((getPageMeta("/faq").jsonLd ?? []).some((o) => (o as Record<string, unknown>)["@type"] === "FAQPage")).toBe(true);
    expect((getPageMeta("/winterization").jsonLd ?? []).some((o) => (o as Record<string, unknown>)["@type"] === "Service")).toBe(true);
  });

  it("unknown routes are noindex and report as not-a-page", () => {
    expect(hasPage("/definitely-not-a-page")).toBe(false);
    expect(getPageMeta("/definitely-not-a-page").noindex).toBe(true);
    expect(hasPage("/pricing")).toBe(true);
  });

  it("normalizes paths and builds absolute canonicals", () => {
    expect(normalizePath("/pricing/")).toBe("/pricing");
    expect(normalizePath("/pricing?x=1#a")).toBe("/pricing");
    expect(normalizePath("/")).toBe("/");
    expect(canonicalUrl("/pricing")).toBe("https://a1marinestorage.ca/pricing");
    expect(canonicalUrl("/")).toBe("https://a1marinestorage.ca/");
  });
});

describe("SEO registry — injectMeta", () => {
  it("rewrites title, description, and self-canonical per route", () => {
    const out = injectMeta(BASE_HTML, getPageMeta("/pricing"));
    expect(out).toContain("<title>Boat Storage &amp; Winterization Pricing | A1 Marine Storage</title>");
    expect(out).toContain('<link rel="canonical" href="https://a1marinestorage.ca/pricing"');
    expect(out).not.toContain("old description");
    expect(out).not.toContain("OLD TITLE");
  });

  it("injects JSON-LD for pages that declare it", () => {
    const out = injectMeta(BASE_HTML, getPageMeta("/"));
    expect(out).toContain("application/ld+json");
    expect(out).toContain('"@type":"LocalBusiness"');
  });

  it("adds robots noindex only for noindex routes", () => {
    expect(injectMeta(BASE_HTML, getPageMeta("/does-not-exist"))).toContain('name="robots" content="noindex');
    expect(injectMeta(BASE_HTML, getPageMeta("/pricing"))).not.toContain("noindex");
  });

  it("preserves $ in injected JSON-LD (priceRange $$ not mangled by String.replace)", () => {
    expect(injectMeta(BASE_HTML, getPageMeta("/"))).toContain('"priceRange":"$$"');
  });
});

describe("SEO registry — sitemap", () => {
  it("includes real pages", () => {
    const xml = renderSitemap();
    expect(xml).toContain("<loc>https://a1marinestorage.ca/</loc>");
    expect(xml).toContain("<loc>https://a1marinestorage.ca/boat-storage</loc>");
    expect(xml).toContain("<loc>https://a1marinestorage.ca/faq</loc>");
  });

  it("excludes ad landing pages (sitemapExclude) and unregistered routes", () => {
    const xml = renderSitemap();
    expect(xml).not.toContain("/winter-quote");
    expect(xml).not.toContain("a1marinestorage.ca/terms");
  });

  it("is a well-formed urlset document", () => {
    const xml = renderSitemap();
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toContain("<urlset");
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });
});

describe("SEO registry — registerPages (Phase 2 extension point)", () => {
  it("registers a page for getPageMeta + sitemap, first-write-wins", () => {
    registerPages([{ path: "/boat-storage/testville", title: "Test Town", description: "d", priority: 0.7 }]);
    registerPages([{ path: "/boat-storage/testville", title: "Should Not Override", description: "d2" }]);
    expect(hasPage("/boat-storage/testville")).toBe(true);
    expect(getPageMeta("/boat-storage/testville").title).toBe("Test Town");
    expect(renderSitemap()).toContain("/boat-storage/testville");
  });
});
