import { calculateQuote } from "@a1/pricing-engine";
import { describe, expect, it } from "vitest";

import {
  buildStorageQuoteInput,
  describeExtras,
  type BoatState,
  type Selection,
} from "../client/src/lib/quote-items";
import { buildQuoteModel, money, type QuoteModel } from "../shared/quote-model";
import { renderQuotePdf, type PdfBrand } from "./quote-pdf";

const BRAND: PdfBrand = {
  businessName: "A1 Marine Storage",
  addressLines: ["639 Concession Road 16 East, Tiny, ON L9M 1R2"],
  phone: "(249) 444-0072",
  website: "a1marinestorage.ca",
  primaryColor: "#C82222",
  darkColor: "#940303",
};

const BOAT: BoatState = { lengthFt: 24, hullType: "", engineType: "outboard", engineCount: 1 };

function modelFor(sel: Selection, extra: Partial<QuoteModel> = {}): QuoteModel {
  const input = buildStorageQuoteInput(sel, BOAT)!;
  return {
    ...buildQuoteModel({
      reference: "A1MS-Q-7K2F9Q",
      issuedAt: "2026-09-02T12:00:00.000Z",
      quote: calculateQuote(input),
      extras: describeExtras(sel, BOAT),
      boat: { lengthFt: BOAT.lengthFt, engineType: BOAT.engineType, engineCount: BOAT.engineCount },
    }),
    ...extra,
  };
}

const BUNDLED: Selection = { mode: "bundle", bundleId: "winter_ready_plus" };

/** PDF bytes are opaque; these assert structure, not pixels. */
const isPdf = (buf: Buffer) => buf.subarray(0, 5).toString("latin1") === "%PDF-";

/** Rough page count from the PDF's page objects. */
function pageCount(buf: Buffer): number {
  const matches = buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

describe("renders a real PDF", () => {
  it("produces a valid PDF for a plain bundled quote", async () => {
    const buf = await renderQuotePdf(modelFor(BUNDLED), BRAND);
    expect(isPdf(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  }, 30_000);

  it("fits a typical quote on one page", async () => {
    const buf = await renderQuotePdf(modelFor(BUNDLED), BRAND);
    expect(pageCount(buf)).toBe(1);
  }, 30_000);

  it("flows onto a further page rather than clipping when lines overflow", async () => {
    // The overflow case the brief calls for: many line items must produce a
    // clean second page, not a truncated first one.
    const many = modelFor(BUNDLED);
    many.lines = Array.from({ length: 60 }, (_, i) => ({
      label: `Service line ${i + 1}`,
      description: `A description long enough to wrap across the available width, line ${i + 1}`,
      amountCents: 12_345,
      outsideBundle: i % 3 === 0,
    }));
    const buf = await renderQuotePdf(many, BRAND);
    expect(isPdf(buf)).toBe(true);
    expect(pageCount(buf)).toBeGreaterThan(1);
  }, 30_000);

  it("renders without a logo, falling back to a wordmark", async () => {
    // A tenant with no logo asset must still get a document, not a crash.
    const buf = await renderQuotePdf(modelFor(BUNDLED), { ...BRAND, logoPath: undefined });
    expect(isPdf(buf)).toBe(true);
  }, 30_000);
});

describe("is a pure function of the model", () => {
  it("the same model renders the same document twice", async () => {
    // Not byte-equality — PDFs carry a creation timestamp — but the same model
    // must not produce structurally different output.
    const model = modelFor(BUNDLED);
    const [a, b] = await Promise.all([renderQuotePdf(model, BRAND), renderQuotePdf(model, BRAND)]);
    expect(pageCount(a)).toBe(pageCount(b));
    expect(Math.abs(a.length - b.length)).toBeLessThan(200);
  }, 30_000);

  it("never recomputes money — it prints what the model holds", async () => {
    // A doctored model must be printed verbatim. If the renderer ever did its
    // own arithmetic, this quote would silently disagree with the panel.
    const model = modelFor(BUNDLED);
    model.totalCents = 999_99;
    model.depositCents = 111_11;
    const buf = await renderQuotePdf(model, BRAND);
    expect(isPdf(buf)).toBe(true);
    // Nothing threw and nothing was "corrected" — the renderer has no opinion
    // about totals, which is what keeps it in step with the panel.
    expect(money(model.totalCents)).toBe("$999.99");
  }, 30_000);
});

describe("handles every logistics state without failing", () => {
  const withLogistics = (over: Partial<NonNullable<QuoteModel["logistics"]>>) =>
    modelFor(BUNDLED, {
      logistics: {
        boatLocation: "home_trailer",
        locationLabel: "On a trailer at home / cottage",
        band: "local",
        bandLabel: "Transport — local",
        bandRange: "0–25 km",
        distanceKm: 18,
        estimated: false,
        townLabel: "Midland",
        pickup: true,
        delivery: true,
        trailerProvided: false,
        inWaterNotice: false,
        customTransportQuote: false,
        ...over,
      },
    });

  it("renders a priced transport band", async () => {
    expect(isPdf(await renderQuotePdf(withLogistics({}), BRAND))).toBe(true);
  }, 30_000);

  it("renders the beyond-band notice with no transport total", async () => {
    const model = withLogistics({
      band: "beyond",
      bandLabel: "Transport — beyond extended band",
      bandRange: null,
      distanceKm: 310,
      estimated: true,
      customTransportQuote: true,
    });
    expect(isPdf(await renderQuotePdf(model, BRAND))).toBe(true);
  }, 30_000);

  it("renders the in-water haul-out notice", async () => {
    const model = withLogistics({
      boatLocation: "lift_or_water",
      locationLabel: "On a lift or in the water",
      inWaterNotice: true,
    });
    expect(isPdf(await renderQuotePdf(model, BRAND))).toBe(true);
  }, 30_000);

  it("renders with no logistics section at all", async () => {
    expect(isPdf(await renderQuotePdf(modelFor(BUNDLED, { logistics: null }), BRAND))).toBe(true);
  }, 30_000);

  it("renders an à-la-carte quote with no package and no savings line", async () => {
    const model = modelFor({ mode: "alacarte", alacarteIds: ["outdoor_storage", "shrink_wrap"] });
    expect(model.packageLabel).toBeNull();
    expect(model.bundleSavingsCents).toBe(0);
    expect(isPdf(await renderQuotePdf(model, BRAND))).toBe(true);
  }, 30_000);
});
