// Maps the storage quote page's selections into a shared-engine QuoteInput.
// Kept separate from the page so the mapping is unit-testable against the
// pricing contract (see quote-items.test.ts).
import {
  STORAGE,
  type EngineType,
  type QuoteInput,
  type QuoteItemInput,
} from "@a1/pricing-engine";

export interface BoatState {
  lengthFt: number;
  hullType: string;
  engineType: EngineType;
  engineCount: number;
}

const ceramicSvc = STORAGE.services.ceramic_upgrade;
export const CERAMIC_MAX_FT =
  ceramicSvc.type === "per_foot" ? (ceramicSvc.maxLengthFt ?? 26) : 26;

export const winterizationId = (engineType: EngineType) =>
  `winterization_${engineType}`;

export function itemForService(
  serviceId: string,
  boat: BoatState
): QuoteItemInput {
  const svc = STORAGE.services[serviceId];
  if (svc.type === "per_foot") return { serviceId, lengthFt: boat.lengthFt };
  if (svc.type === "flat_per_engine")
    return {
      serviceId,
      engineType: boat.engineType,
      engineCount: boat.engineCount,
    };
  return { serviceId };
}

export function bundleServiceIds(bundleId: string, boat: BoatState): string[] {
  return STORAGE.bundles[bundleId].services.map(s =>
    s === "winterization_*" ? winterizationId(boat.engineType) : s
  );
}

/** Where the boat is when the season ends. Drives which transport lines are offered. */
export type BoatLocation =
  | "self_transport"
  | "home_trailer"
  | "marina_ramp"
  | "lift_or_water";

/**
 * Transport band. The names match the engine's `transport_<band>` service keys;
 * `beyond` has no flat service — it is quoted per km, or by hand.
 */
export type TransportBand = "local" | "regional" | "extended" | "beyond";

/**
 * How the band was arrived at. Rides in the lead envelope for auditability.
 *
 * `locality` is a ratified distance from our own town list; `place_estimate` is
 * geocoded from a name the customer typed. Worth telling apart when someone
 * queries a transport charge later.
 */
export type BandResolution = "locality" | "place_estimate";

export interface Logistics {
  boatLocation: BoatLocation;
  /**
   * The town, either way: a locality slug from our list, or the name the
   * customer typed. `bandResolution` says which, so the two never have to be
   * told apart by inspecting the string.
   */
  townSlug?: string | null;
  transportBand?: TransportBand | null;
  distanceKm?: number | null;
  bandResolution?: BandResolution | null;
  /** Fall pickup — one trip. */
  pickup?: boolean;
  /** Spring delivery & launch — one trip. */
  delivery?: boolean;
  /**
   * The customer is leaving their own trailer with us. Captured for the yard, NOT
   * priced: storing a boat on its owner's trailer is not an extra service.
   */
  trailerProvided?: boolean;
}

/** Quantities for the ratified per-unit add-ons. Absent/zero means not selected. */
export interface AddOns {
  batteryCount?: number;
  /** Months stored past April 30, for one vessel. */
  extendedMonths?: number;
  oilChangeOutboard?: boolean;
}

export interface Selection {
  mode: "bundle" | "alacarte" | null;
  bundleId?: string | null;
  alacarteIds?: string[];
  ceramicUpgrade?: boolean;
  logistics?: Logistics;
  addOns?: AddOns;
}

/** Only these locations can have the boat collected. */
export function supportsTransport(location: BoatLocation): boolean {
  return location !== "self_transport";
}

/** In-water pickups need a haul-out plan; there is no engine line for it. */
export function needsHaulOutNotice(location: BoatLocation): boolean {
  return location === "lift_or_water";
}

/** The engine service key for a band, or null when the band has no flat rate. */
export function transportServiceId(band: TransportBand): string | null {
  return band === "beyond" ? null : `transport_${band}`;
}

/**
 * A line this repo appends beyond the package/à-la-carte selection.
 *
 * The engine prices every one of them; this only records WHICH engine line is
 * which, because two transport trips share a service key and would otherwise be
 * indistinguishable in the engine's output. The UI and the PDF label rows from
 * here; they never invent a price.
 */
export interface ExtraLineRef {
  purpose: "ceramic" | "pickup" | "delivery" | "battery" | "extended" | "oil";
  serviceId: string;
  /** Index into QuoteResult.lineItems. Appended in a deterministic order. */
  index: number;
}

/** Build the engine QuoteInput for the current selection, or null if incomplete. */
export function buildStorageQuoteInput(
  sel: Selection,
  boat: BoatState
): QuoteInput | null {
  if (!(boat.lengthFt > 0) || !sel.mode) return null;

  let serviceIds: string[] = [];
  let bundleId: string | undefined;
  if (sel.mode === "bundle" && sel.bundleId) {
    bundleId = sel.bundleId;
    serviceIds = bundleServiceIds(sel.bundleId, boat);
  } else if (sel.mode === "alacarte") {
    serviceIds = (sel.alacarteIds ?? []).map(id =>
      id === "winterization" ? winterizationId(boat.engineType) : id
    );
  }
  if (serviceIds.length === 0) return null;

  const items: QuoteItemInput[] = serviceIds.map(sid =>
    itemForService(sid, boat)
  );
  appendExtras(items, sel, boat);
  return {
    serviceLine: "storage",
    items,
    hullType: boat.hullType || undefined,
    bundleId,
  };
}

/**
 * Append everything that sits OUTSIDE the bundle discount: the ceramic upgrade,
 * transport, trailer, and the per-unit add-ons.
 *
 * None of these is bundle-eligible, and that is the engine's doing rather than
 * ours — a bundle discounts only the services named in its own list, so anything
 * appended here is automatically excluded. There is no "don't discount this"
 * flag in this repo, and there must not be one.
 *
 * Order is DETERMINISTIC because two transport trips share a service key and are
 * otherwise indistinguishable in the engine's output. describeExtras() returns
 * the matching index map.
 */
function appendExtras(
  items: QuoteItemInput[],
  sel: Selection,
  boat: BoatState
): void {
  if (sel.ceramicUpgrade && boat.lengthFt <= CERAMIC_MAX_FT) {
    items.push({ serviceId: "ceramic_upgrade", lengthFt: boat.lengthFt });
  }

  const log = sel.logistics;
  if (log) {
    const band = log.transportBand ?? null;
    const svc = band ? transportServiceId(band) : null;
    // `beyond` yields no line: it is quoted by hand, so showing a total would be
    // inventing a price the business has not set.
    if (svc && supportsTransport(log.boatLocation)) {
      if (log.pickup) items.push({ serviceId: svc, quantity: 1 });
      if (log.delivery) items.push({ serviceId: svc, quantity: 1 });
    }
    // NO trailer_storage line. A boat stored on its owner's own trailer is not
    // an extra service — the trailer is simply under the boat, and charging for
    // it would bill a customer for bringing their own equipment. `trailerProvided`
    // still rides in the lead envelope because the yard needs to know a trailer
    // is coming; it just is not priced.
  }

  const add = sel.addOns;
  if (add) {
    if ((add.batteryCount ?? 0) > 0) {
      items.push({ serviceId: "battery_storage", quantity: add.batteryCount });
    }
    if ((add.extendedMonths ?? 0) > 0) {
      // Per vessel-month; one vessel here (PWC support is a separate task).
      items.push({
        serviceId: "extended_storage",
        quantity: add.extendedMonths,
      });
    }
    // Gated on engine type: the engine has no sterndrive/inboard oil-change service.
    if (add.oilChangeOutboard && boat.engineType === "outboard") {
      items.push({
        serviceId: "oil_change_outboard",
        quantity: boat.engineCount,
      });
    }
  }
}

/**
 * Which appended line is which, by index into the engine's lineItems.
 *
 * Mirrors appendExtras exactly. Kept beside it so the two cannot drift: if a line
 * is added there without being described here, the UI silently mislabels a price.
 */
export function describeExtras(
  sel: Selection,
  boat: BoatState
): ExtraLineRef[] {
  if (!(boat.lengthFt > 0) || !sel.mode) return [];

  const base =
    sel.mode === "bundle" && sel.bundleId
      ? bundleServiceIds(sel.bundleId, boat).length
      : (sel.alacarteIds ?? []).length;

  const refs: ExtraLineRef[] = [];
  let i = base;
  const push = (purpose: ExtraLineRef["purpose"], serviceId: string) => {
    refs.push({ purpose, serviceId, index: i });
    i += 1;
  };

  if (sel.ceramicUpgrade && boat.lengthFt <= CERAMIC_MAX_FT)
    push("ceramic", "ceramic_upgrade");

  const log = sel.logistics;
  if (log) {
    const svc = log.transportBand
      ? transportServiceId(log.transportBand)
      : null;
    if (svc && supportsTransport(log.boatLocation)) {
      if (log.pickup) push("pickup", svc);
      if (log.delivery) push("delivery", svc);
    }
  }

  const add = sel.addOns;
  if (add) {
    if ((add.batteryCount ?? 0) > 0) push("battery", "battery_storage");
    if ((add.extendedMonths ?? 0) > 0) push("extended", "extended_storage");
    if (add.oilChangeOutboard && boat.engineType === "outboard")
      push("oil", "oil_change_outboard");
  }

  return refs;
}
