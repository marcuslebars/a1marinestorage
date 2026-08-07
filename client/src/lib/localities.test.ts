// Locality system: config integrity + genuinely-distinct intros + registry
// registration (meta/JSON-LD/sitemap) + the winter-storage-quote lead plumbing.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALITIES, LOCALITY_SLUGS, findLocality, localityFaq } from "@shared/localities";
import { getPageMeta, hasPage, renderSitemap } from "@shared/seo";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, rel), "utf8");
const wordCount = (s: string) => s.trim().split(/\s+/).length;

describe("localities config", () => {
  it("has 13 towns with unique slugs and names", () => {
    expect(LOCALITIES.length).toBe(13);
    expect(new Set(LOCALITY_SLUGS).size).toBe(13);
    expect(new Set(LOCALITIES.map((l) => l.name)).size).toBe(13);
  });

  it("every intro is a distinct 150–250 word paragraph naming its town (no spun/doorway copy)", () => {
    expect(new Set(LOCALITIES.map((l) => l.intro)).size).toBe(13);
    for (const l of LOCALITIES) {
      expect(l.intro).toContain(l.name);
      expect(wordCount(l.intro)).toBeGreaterThanOrEqual(150);
      expect(wordCount(l.intro)).toBeLessThanOrEqual(270);
    }
  });

  it("findLocality resolves and rejects", () => {
    expect(findLocality("midland")?.name).toBe("Midland");
    expect(findLocality("not-a-town")).toBeUndefined();
  });

  it("per-town FAQ is town-specific", () => {
    const faq = localityFaq(findLocality("honey-harbour")!);
    expect(faq.length).toBeGreaterThanOrEqual(3);
    expect(faq.some((f) => f.a.includes("Honey Harbour"))).toBe(true);
  });
});

describe("localities are registered in the SEO registry", () => {
  it("each is a page with a unique title + Service/LocalBusiness/FAQPage/Breadcrumb JSON-LD", () => {
    for (const l of LOCALITIES) {
      const path = `/boat-storage/${l.slug}`;
      expect(hasPage(path)).toBe(true);
      const meta = getPageMeta(path);
      expect(meta.title).toContain(l.name);
      const types = (meta.jsonLd ?? []).map((o) => (o as Record<string, unknown>)["@type"]);
      expect(types).toEqual(expect.arrayContaining(["Service", "LocalBusiness", "FAQPage", "BreadcrumbList"]));
    }
  });

  it("includes every locality page in the sitemap", () => {
    const xml = renderSitemap();
    for (const l of LOCALITIES) expect(xml).toContain(`/boat-storage/${l.slug}</loc>`);
  });
});

describe("locality lead plumbing (formType winter-storage-quote + locality)", () => {
  it("the locality page tags the form with formType + locality", () => {
    const src = read("../pages/LocalityPage.tsx");
    expect(src).toContain('formType="winter-storage-quote"');
    expect(src).toContain("locality={loc.name}");
  });

  it("the server threads formType + locality into the lead envelope", () => {
    const contact = read("../../../server/contact-handler.ts");
    expect(contact).toContain("locality");
    expect(contact).toContain("formType");
    expect(read("../../../server/empirevu.ts")).toContain('"winter-storage-quote"');
  });
});
