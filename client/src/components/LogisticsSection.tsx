// Step 2's second half — getting the boat here, and the per-unit add-ons.
//
// PRICES COME FROM THE ENGINE, ALWAYS. Every rate, band boundary and label below
// is read from @a1/pricing-engine (TRANSPORT_BANDS, STORAGE.services) or from the
// live quote. Nothing here authors a price, and nothing here decides which band a
// distance falls into — the engine owns both.
import { useState } from "react";
import { AlertTriangle, Loader2, MapPin, Truck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCents, STORAGE, transportBandInfo, type EngineType } from "@a1/pricing-engine";
import { localitiesWithBands } from "@shared/localities";
import {
  needsHaulOutNotice,
  supportsTransport,
  type BandResolution,
  type BoatLocation,
  type TransportBand,
} from "@/lib/quote-items";

const money = (cents: number) => formatCents(cents);

/** "Other / not listed" — the free-text town fallback, not a town slug. */
export const OTHER_TOWN = "__other__";

const BOAT_LOCATIONS: { value: BoatLocation; label: string; hint: string }[] = [
  { value: "home_trailer", label: "At home, on its trailer", hint: "We hook up and tow." },
  { value: "marina_ramp", label: "At a marina or ramp, on a trailer", hint: "Ready to tow when we arrive." },
  { value: "lift_or_water", label: "In the water or on a lift", hint: "Needs hauling out first." },
  { value: "self_transport", label: "I'll bring it to you myself", hint: "No transport needed." },
];

export interface LogisticsValue {
  boatLocation: BoatLocation | null;
  /** A locality slug, OTHER_TOWN, or "" while unset. */
  townSlug: string;
  /** Free-text town when "Other / not listed" is chosen. */
  placeName: string;
  pickup: boolean;
  delivery: boolean;
  trailerProvided: boolean;
  batteryCount: number;
  extendedMonths: number;
  oilChangeOutboard: boolean;
  springWrapRemoval: boolean;
}

export const EMPTY_LOGISTICS: LogisticsValue = {
  boatLocation: null,
  townSlug: "",
  placeName: "",
  pickup: false,
  delivery: false,
  trailerProvided: false,
  batteryCount: 0,
  extendedMonths: 0,
  oilChangeOutboard: false,
  springWrapRemoval: false,
};

/** A band the customer has actually resolved, however they got there. */
export interface ResolvedBand {
  band: TransportBand;
  distanceKm: number;
  resolution: BandResolution;
  /** What the geocoder matched, shown back so an ambiguous name is visible. */
  place?: string;
}

const TOWNS = localitiesWithBands();

/** Resolve the band from a listed town. Free-text names resolve on the server. */
export function bandForTown(slug: string): ResolvedBand | null {
  const t = TOWNS.find((x) => x.slug === slug);
  return t ? { band: t.band, distanceKm: t.distanceKm, resolution: "locality" } : null;
}

// ── Small shared controls ────────────────────────────────────────────────────

function Check({
  checked,
  onChange,
  title,
  sub,
  price,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  sub: string;
  price?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      aria-pressed={checked}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
        disabled
          ? "cursor-not-allowed border-white/8 opacity-40"
          : checked
          ? "border-[oklch(0.6_0.2_27)/50] bg-[oklch(0.6_0.2_27)/8]"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
          checked ? "border-[oklch(0.6_0.2_27)] bg-[oklch(0.6_0.2_27)]" : "border-white/20"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-sm bg-[oklch(0.12_0.018_240)]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-white/45">{sub}</span>
      </span>
      {price && (
        <span className="shrink-0 text-sm font-bold tabular-nums text-[oklch(0.6_0.2_27)]">{price}</span>
      )}
    </button>
  );
}

function Counter({
  value,
  onChange,
  max,
  label,
  sub,
  unitPrice,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
  label: string;
  sub: string;
  unitPrice: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/45">
          {sub} · {unitPrice}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`Fewer: ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-9 w-9 rounded-lg border border-white/15 bg-white/5 text-lg font-bold text-white hover:bg-white/10"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-bold tabular-nums text-white">{value}</span>
        <button
          type="button"
          aria-label={`More: ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-9 w-9 rounded-lg border border-white/15 bg-white/5 text-lg font-bold text-white hover:bg-white/10"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

export function LogisticsSection({
  value,
  onChange,
  engineType,
  engineCount,
  resolvedBand,
  onPlaceResolved,
}: {
  value: LogisticsValue;
  onChange: (patch: Partial<LogisticsValue>) => void;
  engineType: EngineType;
  engineCount: number;
  resolvedBand: ResolvedBand | null;
  onPlaceResolved: (r: ResolvedBand | null) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const location = value.boatLocation;
  const wantsTransport = location != null && supportsTransport(location);
  const bandInfo = resolvedBand ? transportBandInfo(resolvedBand.band) : null;
  // `beyond` has no flat rate: it is quoted by hand, so the UI must not imply one.
  const bandPriced = bandInfo?.rateCents != null;

  async function checkPlace() {
    const place = value.placeName.trim();
    if (!place) return;
    setChecking(true);
    setLookupError("");
    onPlaceResolved(null);
    try {
      const res = await fetch("/api/transport/band", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        band?: TransportBand;
        distanceKm?: number;
        place?: string;
        error?: string;
      };
      if (res.ok && data.ok && data.band && typeof data.distanceKm === "number") {
        onPlaceResolved({
          band: data.band,
          distanceKm: data.distanceKm,
          resolution: "place_estimate",
          place: data.place,
        });
      } else if (data.code === "invalid_place" || data.code === "not_found") {
        // These two ARE about the input: nothing typed, or a town the geocoder
        // does not know. Both are worth the customer re-reading and retrying.
        setLookupError(data.error ?? "We couldn't find that town.");
      } else {
        // Our lookup, not their typing. Never send someone hunting for a typo
        // that isn't there — and always leave the town list as a way through.
        setLookupError("We couldn't look that up right now — pick the nearest town instead.");
      }
    } catch {
      setLookupError("We couldn't reach the lookup. Pick the nearest town instead.");
    } finally {
      setChecking(false);
    }
  }

  const wrapSvc = STORAGE.services.spring_wrap_removal;
  const batterySvc = STORAGE.services.battery_storage;
  const extendedSvc = STORAGE.services.extended_storage;
  const oilSvc = STORAGE.services.oil_change_outboard;
  const trailerSvc = STORAGE.services.trailer_storage;

  return (
    <div className="space-y-4">
      {/* ── Where the boat is ── */}
      <div className="marine-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Truck className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
          <h3 className="text-lg font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Getting Your Boat Here
          </h3>
        </div>
        <p className="mb-4 text-xs text-white/45">
          Optional — skip it and we'll sort transport when we confirm your booking.
        </p>

        <Label className="mb-2 block text-sm font-semibold text-white/80">Where is your boat now?</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {BOAT_LOCATIONS.map((o) => {
            const selected = location === o.value;
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => onChange({ boatLocation: o.value })}
                aria-pressed={selected}
                className={`rounded-xl border p-3 text-left transition-all ${
                  selected
                    ? "border-[oklch(0.6_0.2_27)/50] bg-[oklch(0.6_0.2_27)/8]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <p className="text-sm font-semibold text-white">{o.label}</p>
                <p className="text-xs text-white/45">{o.hint}</p>
              </button>
            );
          })}
        </div>

        {/* In-water pickups need a haul-out, which has no priced line. Say so
            rather than quoting a transport trip that cannot happen on its own. */}
        {location && needsHaulOutNotice(location) && (
          <div className="mt-3 flex gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <p className="text-xs text-white/70">
              Boats in the water need to be hauled out first. That's arranged separately and isn't
              included below — we'll confirm the haul-out with you before your pickup date.
            </p>
          </div>
        )}

        {wantsTransport && (
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            <div>
              <Label className="mb-2 block text-sm font-semibold text-white/80">Where are we picking up from?</Label>
              <Select
                value={value.townSlug}
                onValueChange={(v) => {
                  onChange({ townSlug: v });
                  setLookupError("");
                  // A listed town resolves immediately; "Other" waits for a lookup.
                  onPlaceResolved(v === OTHER_TOWN ? null : bandForTown(v));
                }}
              >
                <SelectTrigger className="h-12 border-white/15 bg-white/5 text-white focus:border-[oklch(0.6_0.2_27)]">
                  <SelectValue placeholder="Choose your town" />
                </SelectTrigger>
                <SelectContent className="border-white/15 bg-[oklch(0.16_0.018_240)]">
                  {TOWNS.map((t) => (
                    <SelectItem key={t.slug} value={t.slug} className="text-white focus:bg-white/10">
                      {t.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_TOWN} className="text-white focus:bg-white/10">
                    Other / not listed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {value.townSlug === OTHER_TOWN && (
              <div>
                <Label className="mb-2 block text-sm font-semibold text-white/80">Town or city</Label>
                <div className="flex gap-2">
                  <Input
                    value={value.placeName}
                    onChange={(e) => {
                      onChange({ placeName: e.target.value });
                      // The old band belonged to the old name. Clearing it stops
                      // a stale price sitting under a town nobody looked up.
                      if (resolvedBand?.resolution === "place_estimate") onPlaceResolved(null);
                      setLookupError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void checkPlace();
                      }
                    }}
                    placeholder="e.g. Gravenhurst"
                    className="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-[oklch(0.6_0.2_27)]"
                  />
                  <button
                    type="button"
                    onClick={() => void checkPlace()}
                    disabled={checking || value.placeName.trim().length < 2}
                    className="h-12 shrink-0 rounded-lg bg-[oklch(0.6_0.2_27)] px-4 text-sm font-semibold text-[oklch(0.12_0.018_240)] disabled:opacity-40"
                  >
                    {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                  </button>
                </div>
                {lookupError && <p className="mt-1.5 text-xs text-yellow-400">{lookupError}</p>}
                <p className="mt-1.5 text-xs text-white/40">
                  Ontario towns only. We estimate road distance from the town centre and confirm it when we
                  book you in.
                </p>
              </div>
            )}

            {resolvedBand && bandInfo && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-[oklch(0.6_0.2_27)]" />
                  <p className="text-sm font-semibold text-white">
                    {bandInfo.label}
                    <span className="ml-2 font-normal text-white/45">
                      ≈{Math.round(resolvedBand.distanceKm)} km
                      {resolvedBand.resolution === "place_estimate" ? " (estimated)" : ""}
                    </span>
                  </p>
                </div>
                {/* A typed name is ambiguous in a way a list choice is not —
                    "London" and "Midland" both exist elsewhere. Showing what we
                    matched lets the customer catch it before a price rests on it. */}
                {resolvedBand.place && resolvedBand.resolution === "place_estimate" && (
                  <p className="mt-1 text-xs text-white/40">Matched: {resolvedBand.place}</p>
                )}
                <p className="mt-1 text-xs text-white/50">
                  {bandPriced
                    ? `${money(bandInfo.rateCents as number)} per trip.`
                    : "You're outside our standard transport zones — we'll quote this by hand, so no transport is added below."}
                </p>
              </div>
            )}

            {/* Trips are only offered once a band is known; a checkbox that
                silently adds nothing is worse than one that isn't there yet. */}
            {resolvedBand && bandPriced && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Check
                  checked={value.pickup}
                  onChange={() => onChange({ pickup: !value.pickup })}
                  title="Fall pickup"
                  sub="We collect it at season's end."
                  price={`+${money(bandInfo.rateCents as number)}`}
                />
                <Check
                  checked={value.delivery}
                  onChange={() => onChange({ delivery: !value.delivery })}
                  title="Spring delivery"
                  sub="We bring it back in spring."
                  price={`+${money(bandInfo.rateCents as number)}`}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-white/10 pt-4">
          <Check
            checked={value.trailerProvided}
            onChange={() => onChange({ trailerProvided: !value.trailerProvided })}
            title="Store my trailer too"
            sub="Your trailer stays in the yard for the season."
            price={`+${money(trailerSvc.type === "flat" ? trailerSvc.rateCents : 0)}`}
          />
        </div>
      </div>

      {/* ── Add-ons ── */}
      <div className="marine-card p-5">
        <h3
          className="mb-4 text-lg font-black text-white"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Anything Else?
        </h3>
        <div className="space-y-2">
          <Counter
            value={value.batteryCount}
            onChange={(n) => onChange({ batteryCount: n })}
            max={8}
            label="Battery storage & charging"
            sub="Kept on a maintainer over winter"
            unitPrice={`${money(batterySvc.type === "per_unit" ? batterySvc.rateCents : 0)}/battery`}
          />
          <Counter
            value={value.extendedMonths}
            onChange={(n) => onChange({ extendedMonths: n })}
            max={6}
            label="Extended storage"
            sub="Months past April 30"
            unitPrice={`${money(extendedSvc.type === "per_unit" ? extendedSvc.rateCents : 0)}/month`}
          />
          {/* The engine has no sterndrive/inboard oil-change service, so the
              option is hidden rather than offered and then refused. */}
          {engineType === "outboard" && (
            <Check
              checked={value.oilChangeOutboard}
              onChange={() => onChange({ oilChangeOutboard: !value.oilChangeOutboard })}
              title="Oil change"
              sub={`Outboard${engineCount > 1 ? `s — ${engineCount} engines` : ""}`}
              price={`+${money((oilSvc.type === "per_unit" ? oilSvc.rateCents : 0) * engineCount)}`}
            />
          )}
          <Check
            checked={value.springWrapRemoval}
            onChange={() => onChange({ springWrapRemoval: !value.springWrapRemoval })}
            title="Spring wrap removal & disposal"
            sub="We take the shrink wrap off and recycle it."
            // Tiered by length: the price depends on the boat, so the live quote
            // panel shows it rather than a single figure here.
            price={wrapSvc.type === "tiered_by_length" ? "by length" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
