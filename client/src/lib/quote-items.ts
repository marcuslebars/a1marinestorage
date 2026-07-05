// Maps the storage quote page's selections into a shared-engine QuoteInput.
// Kept separate from the page so the mapping is unit-testable against the
// pricing contract (see quote-items.test.ts).
import { STORAGE, type EngineType, type QuoteInput, type QuoteItemInput } from "@a1/pricing-engine";

export interface BoatState {
  lengthFt: number;
  hullType: string;
  engineType: EngineType;
  engineCount: number;
}

const ceramicSvc = STORAGE.services.ceramic_upgrade;
export const CERAMIC_MAX_FT = ceramicSvc.type === "per_foot" ? ceramicSvc.maxLengthFt ?? 26 : 26;

export const winterizationId = (engineType: EngineType) => `winterization_${engineType}`;

export function itemForService(serviceId: string, boat: BoatState): QuoteItemInput {
  const svc = STORAGE.services[serviceId];
  if (svc.type === "per_foot") return { serviceId, lengthFt: boat.lengthFt };
  if (svc.type === "flat_per_engine") return { serviceId, engineType: boat.engineType, engineCount: boat.engineCount };
  return { serviceId };
}

export function bundleServiceIds(bundleId: string, boat: BoatState): string[] {
  return STORAGE.bundles[bundleId].services.map((s) => (s === "winterization_*" ? winterizationId(boat.engineType) : s));
}

export interface Selection {
  mode: "bundle" | "alacarte" | null;
  bundleId?: string | null;
  alacarteIds?: string[];
  ceramicUpgrade?: boolean;
}

/** Build the engine QuoteInput for the current selection, or null if incomplete. */
export function buildStorageQuoteInput(sel: Selection, boat: BoatState): QuoteInput | null {
  if (!(boat.lengthFt > 0) || !sel.mode) return null;

  let serviceIds: string[] = [];
  let bundleId: string | undefined;
  if (sel.mode === "bundle" && sel.bundleId) {
    bundleId = sel.bundleId;
    serviceIds = bundleServiceIds(sel.bundleId, boat);
  } else if (sel.mode === "alacarte") {
    serviceIds = (sel.alacarteIds ?? []).map((id) => (id === "winterization" ? winterizationId(boat.engineType) : id));
  }
  if (serviceIds.length === 0) return null;

  const items: QuoteItemInput[] = serviceIds.map((sid) => itemForService(sid, boat));
  if (sel.ceramicUpgrade && boat.lengthFt <= CERAMIC_MAX_FT) {
    items.push({ serviceId: "ceramic_upgrade", lengthFt: boat.lengthFt });
  }
  return { serviceLine: "storage", items, hullType: boat.hullType || undefined, bundleId };
}
