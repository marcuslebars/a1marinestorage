// A1 Marine Storage — engine-derived pricing figures for the PUBLIC marketing
// pages (Pricing, Home, Services).
//
// Everything here is COMPUTED from the shared @a1/pricing-engine — never
// hardcoded — so the same rate change that updates the calculator (Calculator.tsx
// / quote-items.ts) also updates the public copy automatically. If a figure the
// copy needs isn't derivable from the engine's exports, it belongs here as a
// clearly-labelled exception, not as a magic number in a page.
//
// ENGINE v2.0.0 — STORAGE AND SHRINK WRAP ARE ONE PRODUCT.
// Every boat in the yard gets wrapped, so quoting the two apart only ever made
// the total look bigger than a competitor's single per-foot number. The headline
// product `winter_storage` covers season storage, framed shrink wrap AND spring
// wrap removal at one rate. `shrink_wrap` / `spring_wrap_removal` remain priced
// services for customers who store their boat somewhere else — see STANDALONE.
//
// Unit-tested against the v2.0.0 rates in storage-pricing.test.ts.
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
  type StoragePerUnitService,
  type StorageTieredByLengthService,
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
function perUnit(id: string): StoragePerUnitService {
  const svc = S[id];
  if (svc.type !== "per_unit") throw new Error(`storage-pricing: ${id} is not a per_unit service`);
  return svc;
}
function tieredByLength(id: string): StorageTieredByLengthService {
  const svc = S[id];
  if (svc.type !== "tiered_by_length") throw new Error(`storage-pricing: ${id} is not a tiered_by_length service`);
  return svc;
}

/** A per-foot service priced at a given length, floored at its minimum (engine math). */
function priceAtFt(svc: StoragePerFootService, ft: number): number {
  return applyMinimum(perFootCents(svc.rateCents, ft), svc.minimumCents);
}

/** "$1,260 – $1,560": one per-foot service priced at two length endpoints. */
export function bracketRange(serviceId: string, fromFt: number, toFt: number): string {
  const svc = perFoot(serviceId);
  return `${dollars(priceAtFt(svc, fromFt))} – ${dollars(priceAtFt(svc, toFt))}`;
}

/**
 * The length at or below which a per-foot service's minimum is what you pay.
 * Derived, not typed in, so a rate or minimum change moves the copy with it.
 */
export function minimumBindsUpToFt(serviceId: string): number {
  const svc = perFoot(serviceId);
  return Math.floor(svc.minimumCents / svc.rateCents);
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
  /** THE headline number: storage + shrink wrap + spring removal, one rate. */
  winterPerFoot: dollars(perFoot("winter_storage").rateCents), // "$60"
  winterMin: dollars(perFoot("winter_storage").minimumCents), // "$1,000"
  winterMinUpToFt: minimumBindsUpToFt("winter_storage"), // 16
  fallDetailPerFoot: dollars(perFoot("fall_detail").rateCents), // "$24"
  ceramicPerFoot: dollars(perFoot("ceramic_upgrade").rateCents), // "$85"
  springCommissioning: dollars(flat("spring_commissioning").rateCents), // "$265"
  pontoonSurcharge: dollars(STORAGE.hullSurcharges.pontoon.perFootCents), // "$16"
  tritoonSurcharge: dollars(STORAGE.hullSurcharges.tritoon.perFootCents), // "$20"
  batteryPerUnit: dollars(perUnit("battery_storage").rateCents), // "$100"
  trailer: dollars(flat("trailer_storage").rateCents), // "$200"
  pwcStorage: dollars(perUnit("pwc_storage").rateCents), // "$450"
  pwcWinterization: dollars(perUnit("pwc_winterization").rateCents), // "$175"
  oilChangeOutboard: dollars(perUnit("oil_change_outboard").rateCents), // "$175"
  extendedPerMonth: dollars(perUnit("extended_storage").rateCents), // "$100"
};

/**
 * Wrap priced on its own — ONLY for a boat stored somewhere else.
 *
 * Kept separate from RATES so no page accidentally shows a wrap price beside the
 * storage rate and re-creates the two-number comparison the merge removed.
 */
export const STANDALONE = {
  wrapPerFoot: dollars(perFoot("shrink_wrap").rateCents), // "$25"
  wrapMin: dollars(perFoot("shrink_wrap").minimumCents), // "$375"
  removalLower: dollars(tieredByLength("spring_wrap_removal").tiers[0].rateCents), // "$150"
  removalUpper: dollars(
    tieredByLength("spring_wrap_removal").tiers[tieredByLength("spring_wrap_removal").tiers.length - 1].rateCents,
  ), // "$200"
  removalBreakpointFt: tieredByLength("spring_wrap_removal").tiers[0].maxFt ?? 26, // 26
};

/** Bundle discount percentages, engine-derived. Two tiers above the base product. */
export const BUNDLE_PCT = {
  winterReadyPlus: STORAGE.bundles.winter_ready_plus.discountPct, // 5
  fullCare: STORAGE.bundles.full_care.discountPct, // 8
};

/**
 * What the one rate covers. Copy, not pricing — but it lives here because every
 * page that shows the rate has to say the same three things about it.
 */
export const WINTER_INCLUDES = [
  "Secure outdoor storage at our Tiny yard, October through April",
  "Framed, vented shrink wrap — fitted after your boat is positioned",
  "Spring wrap removal and disposal, so you never touch a utility knife",
] as const;

/**
 * The worked bundle example from the copy: a 24 ft sterndrive with the winter
 * rate plus winterization — à la carte vs. the Winter Ready Plus tier. Produced
 * by actually running the engine's quote function, never hardcoded.
 */
export function workedExample() {
  const items = [
    { serviceId: "winter_storage", lengthFt: 24 },
    { serviceId: "winterization_sterndrive", engineType: "sterndrive" as EngineType, engineCount: 1 },
  ];
  const alaCarte = calculateQuote({ serviceLine: "storage", items });
  const bundled = calculateQuote({ serviceLine: "storage", items, bundleId: "winter_ready_plus" });
  return {
    lengthFt: 24,
    aLaCarteCents: alaCarte.aLaCarteSubtotalCents,
    bundledCents: bundled.subtotalCents,
    savingsCents: bundled.bundleSavingsCents,
    aLaCarte: dollars(alaCarte.aLaCarteSubtotalCents), // "$1,840"
    bundled: dollars(bundled.subtotalCents), // "$1,748"
    savings: dollars(bundled.bundleSavingsCents), // "$92"
    discountPct: STORAGE.bundles.winter_ready_plus.discountPct, // 5
  };
}

/**
 * The Full Care worked example — the whole season in one booking, engine-run.
 * Used wherever the copy needs a real end-to-end number rather than a rate.
 */
export function fullCareExample() {
  const items = [
    { serviceId: "winter_storage", lengthFt: 24 },
    { serviceId: "winterization_sterndrive", engineType: "sterndrive" as EngineType, engineCount: 1 },
    { serviceId: "fall_detail", lengthFt: 24 },
    { serviceId: "spring_commissioning" },
  ];
  const alaCarte = calculateQuote({ serviceLine: "storage", items });
  const bundled = calculateQuote({ serviceLine: "storage", items, bundleId: "full_care" });
  return {
    lengthFt: 24,
    aLaCarte: dollars(alaCarte.aLaCarteSubtotalCents), // "$2,681"
    bundled: dollars(bundled.subtotalCents), // "$2,467"
    savings: dollars(bundled.bundleSavingsCents), // "$214"
    discountPct: STORAGE.bundles.full_care.discountPct, // 8
  };
}
