// Pricing contract for the PUBLIC marketing pages: every figure shown on the
// Pricing / Home / Services / locality pages must be engine-derived (v2.0.0) —
// and the split storage/wrap rates must be gone from the copy entirely.
//
// v2.0.0 merged outdoor storage and shrink wrap into ONE product. The point of
// the merge was that a customer comparing us to a marina saw two numbers to add
// up where the marina published one. So the strongest test here is not that the
// new rate is $60 — it is that no public page shows a storage rate and a wrap
// rate side by side ever again.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RATES,
  STANDALONE,
  WINTERIZATION,
  BUNDLE_PCT,
  WINTER_INCLUDES,
  bracketRange,
  minimumBindsUpToFt,
  perFootBrackets,
  workedExample,
  fullCareExample,
} from "./storage-pricing";

const clientSrc = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(ent.name) && !/\.test\.tsx?$/.test(ent.name)) out.push(p);
  }
  return out;
}

describe("public pricing figures are engine-derived (v2.0.0)", () => {
  it("the headline is ONE combined rate", () => {
    expect(RATES.winterPerFoot).toBe("$60");
    expect(RATES.winterMin).toBe("$1,000");
    expect(RATES.winterMinUpToFt).toBe(16);
  });

  it("the minimum breakpoint is derived from the rate, not typed in", () => {
    // $1,000 / $60 = 16.67 -> a 16 ft boat pays the minimum, a 17 ft boat does not.
    expect(minimumBindsUpToFt("winter_storage")).toBe(16);
  });

  it("hull surcharges doubled so the merge did not halve them", () => {
    // Pre-v2 the surcharge was charged on storage AND on wrap. One service must
    // carry both, or every pontoon silently got ~$192 off a 24-footer.
    expect(RATES.pontoonSurcharge).toBe("$16");
    expect(RATES.tritoonSurcharge).toBe("$20");
  });

  it("unchanged add-on rates", () => {
    expect(RATES.fallDetailPerFoot).toBe("$24");
    expect(RATES.ceramicPerFoot).toBe("$85");
    expect(RATES.springCommissioning).toBe("$265");
    expect(RATES.batteryPerUnit).toBe("$100");
    expect(RATES.trailer).toBe("$200");
    expect(RATES.pwcStorage).toBe("$450");
    expect(RATES.oilChangeOutboard).toBe("$175");
    expect(RATES.extendedPerMonth).toBe("$100");
  });

  it("winterization flat + additional-engine amounts by engine type", () => {
    const byEngine = Object.fromEntries(WINTERIZATION.map((w) => [w.engine, w]));
    expect(byEngine.outboard.price).toBe("$275");
    expect(byEngine.sterndrive.price).toBe("$400");
    expect(byEngine.inboard.price).toBe("$445");
    expect(byEngine.outboard.additional).toBe("$206");
    expect(byEngine.sterndrive.additional).toBe("$300");
    expect(byEngine.inboard.additional).toBe("$334");
  });

  it("two bundle tiers above the base product: 5% and 8%", () => {
    expect(BUNDLE_PCT.winterReadyPlus).toBe(5);
    expect(BUNDLE_PCT.fullCare).toBe(8);
    // The old three-tier ladder is gone: storage+wrap is the product, not a bundle.
    expect(BUNDLE_PCT).not.toHaveProperty("winterReady");
  });

  it("bracket ranges compute at length endpoints (minimum-applied)", () => {
    expect(bracketRange("winter_storage", 21, 26)).toBe("$1,260 – $1,560");
    expect(bracketRange("winter_storage", 27, 32)).toBe("$1,620 – $1,920");

    const b = perFootBrackets("winter_storage");
    expect(b[0]).toEqual({ length: "Up to 20 ft", rate: "from $1,000" });
    expect(b[3]).toEqual({ length: "33 ft+", rate: "Confirmed at quote" });
  });

  it("worked examples are produced by the engine, not hardcoded", () => {
    const wr = workedExample();
    expect(wr.aLaCarte).toBe("$1,840");
    expect(wr.bundled).toBe("$1,748");
    expect(wr.savings).toBe("$92");
    expect(wr.discountPct).toBe(5);
    expect(wr.aLaCarteCents).toBe(184000);
    expect(wr.bundledCents).toBe(174800);

    const fc = fullCareExample();
    expect(fc.aLaCarte).toBe("$2,681");
    expect(fc.bundled).toBe("$2,467");
    expect(fc.savings).toBe("$214");
    expect(fc.discountPct).toBe(8);
  });

  it("the wrap-only rates stay available but separate from RATES", () => {
    // Still a real service for boats stored elsewhere — it just must never sit
    // beside the storage rate, which is why it lives in its own export.
    expect(STANDALONE.wrapPerFoot).toBe("$25");
    expect(STANDALONE.wrapMin).toBe("$375");
    expect(STANDALONE.removalLower).toBe("$150");
    expect(STANDALONE.removalUpper).toBe("$200");
    expect(STANDALONE.removalBreakpointFt).toBe(26);
    expect(RATES).not.toHaveProperty("shrinkPerFoot");
    expect(RATES).not.toHaveProperty("outdoorPerFoot");
  });

  it("the rate states what it covers, in three parts", () => {
    expect(WINTER_INCLUDES).toHaveLength(3);
    const all = WINTER_INCLUDES.join(" ").toLowerCase();
    expect(all).toContain("storage");
    expect(all).toContain("shrink wrap");
    expect(all).toContain("removal");
  });
});

describe("the retired split rates are gone from client source", () => {
  // Needles split so this file never matches itself; *.test.ts are skipped.
  const FORBIDDEN = [
    "outdoor" + "_storage", // retired engine service id
    "RATES.outdoor" + "PerFoot",
    "RATES.shrink" + "PerFoot",
    "RATES.shrink" + "Min",
    "WRAP" + "_REMOVAL", // renamed to STANDALONE
    "Indoor" + " Storage", // still advertised-but-unpriced; must stay absent
  ];

  it("no client source file references a retired pricing symbol", () => {
    const hits: string[] = [];
    for (const file of walk(clientSrc)) {
      const text = readFileSync(file, "utf8");
      for (const needle of FORBIDDEN) {
        if (text.includes(needle)) {
          hits.push(`${file.replace(clientSrc, "client/src")} :: "${needle}"`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("the Pricing page leads with the combined rate and names what it includes", () => {
    const pricing = readFileSync(join(clientSrc, "pages", "Pricing.tsx"), "utf8");
    expect(pricing).toContain("RATES.winterPerFoot");
    expect(pricing).toContain("WINTER_INCLUDES");
    // The wrap-only price may appear, but only as the stored-elsewhere caveat.
    expect(pricing).toContain("STANDALONE.wrapPerFoot");
  });

  it("the add-on services still render on the Pricing page", () => {
    const pricing = readFileSync(join(clientSrc, "pages", "Pricing.tsx"), "utf8");
    for (const title of [
      "Battery Storage & Charging",
      "Trailer Storage",
      "Spring Wrap Removal & Disposal",
    ]) {
      expect(pricing).toContain(title);
    }
  });
});
