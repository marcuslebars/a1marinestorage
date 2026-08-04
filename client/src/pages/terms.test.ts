// /terms route — the Terms of Service page renders, is routed, linked from the
// footer, referenced at the booking-intent submits, and in the sitemap. Source
// assertions (repo runs vitest in node env, no DOM — see storage-pricing.test.ts).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // client/src/pages
const read = (rel: string) => readFileSync(join(here, rel), "utf8");

describe("/terms — Terms of Service", () => {
  it("the page renders the title, intro, and key clauses", () => {
    const terms = read("Terms.tsx");
    expect(terms).toContain("Terms of Service");
    expect(terms).toContain('you ("the Owner") agree to these terms');
    expect(terms).toContain("3. Cancellation and refunds");
    expect(terms).toContain("5. Limitation of liability");
    expect(terms).toContain("Repair and Storage Liens Act");
    expect(terms).toContain("13. General");
  });

  it("has the legal entity filled from BUSINESS (no placeholder left)", () => {
    const terms = read("Terms.tsx");
    const privacy = read("Privacy.tsx");
    const business = read("../content/business.ts");
    expect(business).toContain('legalName: "Thinker Holdings Inc."');
    expect(terms).toContain("BUSINESS.legalName");
    expect(privacy).toContain("BUSINESS.legalName");
    expect(terms).not.toContain("[BUSINESS LEGAL NAME]");
    expect(privacy).not.toContain("[BUSINESS LEGAL NAME]");
  });

  it("is wired into the router", () => {
    const app = read("../App.tsx");
    expect(app).toContain('import Terms from "./pages/Terms"');
    expect(app).toContain('path="/terms"');
  });

  it("is linked from the footer beside Privacy Policy", () => {
    const footer = read("../components/SiteFooter.tsx");
    expect(footer).toContain('href: "/terms"');
    expect(footer).toContain("Terms of Service");
    expect(footer).toContain("Privacy Policy");
  });

  it("has the booking-consent link at the quote flow's final step", () => {
    const calc = read("Calculator.tsx");
    expect(calc).toContain("By booking, you agree to our");
    expect(calc).toContain('href="/terms"');
  });

  it("has the booking-consent link at the contact/request form", () => {
    const contact = read("Contact.tsx");
    expect(contact).toContain("By booking, you agree to our");
    expect(contact).toContain('href="/terms"');
  });

  it("is listed in sitemap.xml", () => {
    expect(read("../../public/sitemap.xml")).toContain("https://a1marinestorage.ca/terms");
  });
});
