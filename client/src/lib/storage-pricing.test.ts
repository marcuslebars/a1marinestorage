// Pricing contract for the PUBLIC marketing pages: every figure shown on the
// Pricing / Home / Services pages must be engine-derived (v1.1.0) and match the
// copy doc — and the four advertised-but-unpriced services must be gone.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RATES,
  WINTERIZATION,
  BUNDLE_PCT,
  WRAP_REMOVAL,
  bracketRange,
  perFootBrackets,
  workedExample,
} from "./storage-pricing";

describe("public pricing figures are engine-derived (v1.1.0)", () => {
  it("headline per-foot rates, minimums, and flat rates", () => {
    expect(RATES.outdoorPerFoot).toBe("$50");
    expect(RATES.outdoorMin).toBe("$750");
    expect(RATES.shrinkPerFoot).toBe("$25");
    expect(RATES.shrinkMin).toBe("$375");
    expect(RATES.fallDetailPerFoot).toBe("$24");
    expect(RATES.ceramicPerFoot).toBe("$85");
    expect(RATES.springCommissioning).toBe("$265");
    expect(RATES.pontoonSurcharge).toBe("$8");
    expect(RATES.tritoonSurcharge).toBe("$10");
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

  it("bundle discount percentages are 8 / 10 / 12", () => {
    expect(BUNDLE_PCT.winterReady).toBe(8);
    expect(BUNDLE_PCT.winterReadyPlus).toBe(10);
    expect(BUNDLE_PCT.fullCare).toBe(12);
  });

  it("bracket ranges compute at length endpoints (minimum-applied)", () => {
    expect(bracketRange("outdoor_storage", 21, 26)).toBe("$1,050 – $1,300");
    expect(bracketRange("outdoor_storage", 27, 32)).toBe("$1,350 – $1,600");
    expect(bracketRange("shrink_wrap", 21, 26)).toBe("$525 – $650");
    expect(bracketRange("shrink_wrap", 27, 32)).toBe("$675 – $800");

    const outdoor = perFootBrackets("outdoor_storage");
    expect(outdoor[0]).toEqual({ length: "Up to 20 ft", rate: "from $750" });
    expect(outdoor[3]).toEqual({ length: "33 ft+", rate: "Confirmed at quote" });
  });

  it("worked example is produced by the engine: $2,200 à la carte -> $1,980 with Winter Ready Plus", () => {
    const ex = workedExample();
    expect(ex.aLaCarte).toBe("$2,200");
    expect(ex.bundled).toBe("$1,980");
    expect(ex.savings).toBe("$220");
    expect(ex.discountPct).toBe(10);
    // Prove these are real engine cents, not string-forced numbers.
    expect(ex.aLaCarteCents).toBe(220000);
    expect(ex.bundledCents).toBe(198000);
    expect(ex.savingsCents).toBe(22000);
  });
});

describe("Indoor Storage (still unpriced) is absent from client/src", () => {
  // As of engine v1.2.0, Indoor Storage is the ONLY advertised-but-unpriced
  // service — Battery / Trailer / Spring Wrap Removal are now real, priced, and
  // expected to appear. Needle split so this file never matches itself; *.test.ts
  // files are skipped in the walk.
  const FORBIDDEN = ["Indoor" + " Storage"];

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) out.push(...walk(p));
      else if (/\.tsx?$/.test(ent.name) && !/\.test\.tsx?$/.test(ent.name)) out.push(p);
    }
    return out;
  }

  it("no client source file mentions Indoor Storage", () => {
    const clientSrc = join(dirname(fileURLToPath(import.meta.url)), ".."); // client/src
    const hits: string[] = [];
    for (const file of walk(clientSrc)) {
      const text = readFileSync(file, "utf8");
      for (const needle of FORBIDDEN) {
        if (text.includes(needle)) hits.push(`${file.replace(clientSrc, "client/src")} :: "${needle}"`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("v1.2.0 add-on services render with engine-derived prices", () => {
  it("battery / trailer / wrap-removal figures are engine-derived", () => {
    expect(RATES.batteryPerUnit).toBe("$100");
    expect(RATES.trailer).toBe("$400");
    expect(WRAP_REMOVAL.lower).toBe("$150");
    expect(WRAP_REMOVAL.upper).toBe("$200");
    expect(WRAP_REMOVAL.breakpointFt).toBe(26);
  });

  it("the three services appear on the Pricing page", () => {
    const pricing = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "pages", "Pricing.tsx"),
      "utf8",
    );
    for (const title of ["Battery Storage & Charging", "Trailer Storage", "Spring Wrap Removal & Disposal"]) {
      expect(pricing).toContain(title);
    }
  });
});
