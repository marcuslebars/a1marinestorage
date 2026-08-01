// A1 Marine Storage — engine-derived pricing figures for the PUBLIC marketing
// pages (Pricing, Home, Services).
//
// Everything here is COMPUTED from the shared @a1/pricing-engine — never
// hardcoded — so the same rate change that updates the calculator (Calculator.tsx
// / quote-items.ts) also updates the public copy automatically. If a figure the
// copy needs isn't derivable from the engine's exports, it belongs here as a
// clearly-labelled exception, not as a magic number in a page.
//
// Copy source: docs/a1-storage-pricing-page-copy.md. Unit-tested against the
// v1.1.0 rates in storage-pricing.test.ts.
import {
  STORAGE,
  calculateQuote,
  perFootCents,
  applyMinimum,
  additionalEngineUnitCents,
  type EngineType,
  type StoragePerFootService,
  type StorageFlatService,
  type StorageFlatPerEngineService,
} from "@a1/pricing-engine";

const S = STORAGE.services;

/** Whole-dollar CAD label, e.g. 120000 -> "$1,200". Marketing copy uses whole dollars. */
export function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-CA")}`;
}

function perFoot(id: string): StoragePerFootService {
  const svc = S[id];
  if (svc.type !== "per_foot") throw new Error(`storage-pricing: ${id} is not a per_foot service`);
  return svc;
}
function flat(id: string): StorageFlatService {
  const svc = S[id];
  if (svc.type !== "flat") throw new Error(`storage-pricing: ${id} is not a flat service`);
  return svc;
}
function perEngine(id: string): StorageFlatPerEngineService {
  const svc = S[id];
  if (svc.type !== "flat_per_engine") throw new Error(`storage-pricing: ${id} is not a flat_per_engine service`);
  return svc;
}

/** A per-foot service priced at a given length, floored at its minimum (engine math). */
function priceAtFt(svc: StoragePerFootService, ft: number): number {
  return applyMinimum(perFootCents(svc.rateCents, ft), svc.minimumCents);
}

/** "$1,050 – $1,300": one per-foot service priced at two length endpoints. */
export function bracketRange(serviceId: string, fromFt: number, toFt: number): string {
  const svc = perFoot(serviceId);
  return `${dollars(priceAtFt(svc, fromFt))} – ${dollars(priceAtFt(svc, toFt))}`;
}

/**
 * Length brackets for a per-foot service. The length breakpoints (20 / 21–26 /
 * 27–32 / 33+) are a COPY choice — the engine prices continuously per foot — but
 * every PRICE shown is engine-derived (endpoint × rate, floored at the minimum).
 */
export function perFootBrackets(serviceId: string): { length: string; rate: string }[] {
  const svc = perFoot(serviceId);
  return [
    { length: "Up to 20 ft", rate: `from ${dollars(svc.minimumCents)}` },
    { length: "21–26 ft", rate: bracketRange(serviceId, 21, 26) },
    { length: "27–32 ft", rate: bracketRange(serviceId, 27, 32) },
    { length: "33 ft+", rate: "Confirmed at quote" },
  ];
}

const ENGINE_LABEL: Record<EngineType, string> = {
  outboard: "Outboard",
  sterndrive: "Sterndrive",
  inboard: "Inboard",
};

/** Winterization flat rate + each-additional-engine amount, per engine type (engine-derived). */
export const WINTERIZATION = (["outboard", "sterndrive", "inboard"] as EngineType[]).map((t) => {
  const svc = perEngine(`winterization_${t}`);
  return {
    engine: t,
    label: ENGINE_LABEL[t],
    price: dollars(svc.rateCents),
    additional: dollars(additionalEngineUnitCents(svc.rateCents, svc.additionalEngineMultiplier)),
  };
});

/** Headline figures used across the marketing pages — all engine-derived. */
export const RATES = {
  outdoorPerFoot: dollars(perFoot("outdoor_storage").rateCents), // "$50"
  outdoorMin: dollars(perFoot("outdoor_storage").minimumCents), // "$750"
  shrinkPerFoot: dollars(perFoot("shrink_wrap").rateCents), // "$25"
  shrinkMin: dollars(perFoot("shrink_wrap").minimumCents), // "$375"
  fallDetailPerFoot: dollars(perFoot("fall_detail").rateCents), // "$24"
  ceramicPerFoot: dollars(perFoot("ceramic_upgrade").rateCents), // "$85"
  springCommissioning: dollars(flat("spring_commissioning").rateCents), // "$265"
  pontoonSurcharge: dollars(STORAGE.hullSurcharges.pontoon.perFootCents), // "$8"
  tritoonSurcharge: dollars(STORAGE.hullSurcharges.tritoon.perFootCents), // "$10"
};

/** Bundle discount percentages, engine-derived. */
export const BUNDLE_PCT = {
  winterReady: STORAGE.bundles.winter_ready.discountPct, // 8
  winterReadyPlus: STORAGE.bundles.winter_ready_plus.discountPct, // 10
  fullCare: STORAGE.bundles.full_care.discountPct, // 12
};

/**
 * The worked bundle example from the copy: a 24 ft sterndrive with storage, wrap,
 * and winterization — à la carte vs. the Winter Ready Plus bundle. Produced by
 * actually running the engine's quote function, never hardcoded.
 */
export function workedExample() {
  const items = [
    { serviceId: "outdoor_storage", lengthFt: 24 },
    { serviceId: "shrink_wrap", lengthFt: 24 },
    { serviceId: "winterization_sterndrive", engineType: "sterndrive" as EngineType, engineCount: 1 },
  ];
  const alaCarte = calculateQuote({ serviceLine: "storage", items });
  const bundled = calculateQuote({ serviceLine: "storage", items, bundleId: "winter_ready_plus" });
  return {
    lengthFt: 24,
    aLaCarteCents: alaCarte.aLaCarteSubtotalCents,
    bundledCents: bundled.subtotalCents,
    savingsCents: bundled.bundleSavingsCents,
    aLaCarte: dollars(alaCarte.aLaCarteSubtotalCents), // "$2,200"
    bundled: dollars(bundled.subtotalCents), // "$1,980"
    savings: dollars(bundled.bundleSavingsCents), // "$220"
    discountPct: STORAGE.bundles.winter_ready_plus.discountPct, // 10
  };
}
