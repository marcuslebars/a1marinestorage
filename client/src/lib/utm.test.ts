// UTM: node-env guards + source-scan that the capture→submit→envelope wiring is
// present end-to-end (vitest runs in node with no DOM, so runtime capture is
// exercised only for its guards; the plumbing is asserted structurally).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { captureUtm, getUtm } from "./utm";

const here = dirname(fileURLToPath(import.meta.url)); // client/src/lib
const read = (rel: string) => readFileSync(join(here, rel), "utf8");

describe("utm — node guards", () => {
  it("captureUtm never throws without a DOM and getUtm returns undefined", () => {
    expect(() => captureUtm()).not.toThrow();
    expect(getUtm()).toBeUndefined();
  });
});

describe("UTM plumbing is wired end-to-end", () => {
  it("is captured on first app load", () => {
    expect(read("../main.tsx")).toContain("captureUtm()");
  });

  it("is attached by the quote and contact forms", () => {
    expect(read("../pages/Calculator.tsx")).toContain("utm: getUtm()");
    expect(read("../pages/Contact.tsx")).toContain("getUtm()");
    expect(read("../components/QuoteRequestForm.tsx")).toContain("getUtm()");
  });

  it("is threaded into the lead envelope server-side", () => {
    // quote-handler already read meta.utm; contact path now threads utm too
    expect(read("../../../server/quote-handler.ts")).toContain("utm");
    expect(read("../../../server/contact-handler.ts")).toContain("utm");
    expect(read("../../../server/empirevu.ts")).toContain("utm: input.utm");
  });
});
