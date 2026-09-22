import { describe, expect, it } from "vitest";

import { LOCALITY_REDIRECTS, redirectTargetFor } from "./redirects";
import { LOCALITIES } from "../shared/localities";
import { sitemapPages } from "../shared/seo";

const CARE = "https://a1marinecare.ca";

describe("storage → care redirect map", () => {
  it("sends the homepage and every wrap/quote page to the shrink-wrap landing page", () => {
    for (const p of ["/", "/shrink-wrapping", "/winter-quote", "/calculator", "/pricing", "/boat-storage", "/winterization"]) {
      expect(redirectTargetFor(p)).toBe(`${CARE}/shrink-wrapping`);
    }
  });

  it("normalises trailing slashes", () => {
    expect(redirectTargetFor("/pricing/")).toBe(`${CARE}/shrink-wrapping`);
    expect(redirectTargetFor("/boat-storage/midland/")).toBe(`${CARE}/shrink-wrapping/midland`);
  });

  it("maps every storage locality to a Care location page", () => {
    // Every town in the locality registry must have an explicit mapping — a new
    // town added to LOCALITIES without one would silently fall to the landing page.
    for (const loc of LOCALITIES) {
      expect(LOCALITY_REDIRECTS[loc.slug], `no redirect for ${loc.slug}`).toBeTruthy();
      expect(redirectTargetFor(`/boat-storage/${loc.slug}`)).toBe(`${CARE}/shrink-wrapping/${LOCALITY_REDIRECTS[loc.slug]}`);
    }
  });

  it("an unknown locality still lands on the landing page, never a 404", () => {
    expect(redirectTargetFor("/boat-storage/nowhere")).toBe(`${CARE}/shrink-wrapping`);
    expect(redirectTargetFor("/some/old/path")).toBe(`${CARE}/shrink-wrapping`);
  });

  it("every page in the sitemap registry has a real target (nothing redirects into a loop)", () => {
    for (const page of sitemapPages()) {
      const target = redirectTargetFor(page.path);
      expect(target, page.path).toMatch(/^https:\/\/(a1marinecare\.ca|a1marine\.ca)\//);
    }
  });

  it("terms keeps going to the umbrella terms page", () => {
    expect(redirectTargetFor("/terms")).toBe("https://a1marine.ca/terms");
  });

  it("preserves the query string (UTMs) and keeps it ahead of a fragment", () => {
    expect(redirectTargetFor("/winter-quote", "?utm_source=meta&utm_campaign=x")).toBe(
      `${CARE}/shrink-wrapping?utm_source=meta&utm_campaign=x`,
    );
    expect(redirectTargetFor("/faq", "utm_source=meta")).toBe(`${CARE}/shrink-wrapping?utm_source=meta#faq`);
  });

  it("leaves the API and robots.txt to this server", () => {
    expect(redirectTargetFor("/api/unsubscribe")).toBeNull();
    expect(redirectTargetFor("/api/quote/resume")).toBeNull();
    expect(redirectTargetFor("/robots.txt")).toBeNull();
  });
});
