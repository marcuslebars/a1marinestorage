/**
 * Render a sample quote PDF for eyeballing the layout.
 *
 * Dev-only. Uses the same renderer and the same model builder the endpoint will,
 * so what you see here is what a customer gets.
 *
 * Usage: node scripts/sample-quote-pdf.mjs [outfile]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { calculateQuote } from "@a1/pricing-engine";

import { buildStorageQuoteInput, describeExtras } from "../client/src/lib/quote-items.ts";
import { buildQuoteModel } from "../shared/quote-model.ts";
import { renderQuotePdf } from "../server/quote-pdf.tsx";

const out = process.argv[2] ?? "sample-quote.pdf";

const boat = { lengthFt: 24, hullType: "", engineType: "outboard", engineCount: 1 };

// A realistic quote: bundle + transport both ways + trailer + a couple of add-ons.
const selection = {
  mode: "bundle",
  bundleId: "winter_ready_plus",
  logistics: {
    boatLocation: "home_trailer",
    transportBand: "local",
    pickup: true,
    delivery: true,
    trailerProvided: true,
  },
  addOns: { batteryCount: 2, oilChangeOutboard: true },
};

const quote = calculateQuote(buildStorageQuoteInput(selection, boat));

const model = buildQuoteModel({
  reference: "A1MS-Q-7K2F9Q",
  issuedAt: new Date().toISOString(),
  quote,
  extras: describeExtras(selection, boat),
  boat: { lengthFt: boat.lengthFt, engineType: boat.engineType, engineCount: boat.engineCount },
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
    trailerProvided: true,
    inWaterNotice: false,
    customTransportQuote: false,
  },
  resumeUrl: "https://a1marinestorage.ca/calculator?q=7K2F9Q",
});

const brand = {
  businessName: "A1 Marine Storage",
  addressLines: ["639 Concession Road 16 East, Tiny, ON L9M 1R2"],
  phone: "(249) 444-0072",
  website: "a1marinestorage.ca",
  logo: { data: readFileSync(fileURLToPath(new URL("../client/public/a1-marine-storage-logo.png", import.meta.url))), format: "png" },
  primaryColor: "#C82222",
  darkColor: "#940303",
};

const buf = await renderQuotePdf(model, brand);
writeFileSync(out, buf);
console.log(`wrote ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
console.log(`subtotal ${model.subtotalCents} tax ${model.taxCents} total ${model.totalCents} deposit ${model.depositCents}`);
