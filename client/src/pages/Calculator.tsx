// A1 Marine Storage — Interactive Storage Calculator
// Multi-step quote tool: Boat Details → Services → Review → Contact/Submit
// Style: Contemporary Coastal Modernism — dark harbor, cyan accents, sticky price panel
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Snowflake, Shield, Wrench, Sun, Truck,
  Battery, Anchor, Calculator as CalculatorIcon, User, Send, Info, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ⚠️ PLACEHOLDER RATES — update with real pricing before launch
const RATES = {
  shrinkWrap: 14.00,        // per foot
  indoorStorage: 22.00,     // per foot per season
  outdoorStorage: 14.00,    // per foot per season
  winterization: 350,       // flat fee
  springRemoval: 8.00,      // per foot
  batteryStorage: 45,       // per battery per season
  trailerStorage: 250,      // flat fee per season
};

const BOAT_TYPES = [
  { value: "powerboat", label: "Powerboat / Runabout" },
  { value: "pontoon", label: "Pontoon Boat" },
  { value: "sailboat", label: "Sailboat" },
  { value: "pwc", label: "PWC / Jet Ski" },
  { value: "cruiser", label: "Cruiser / Cabin Boat" },
  { value: "other", label: "Other" },
];

const STEPS = [
  { id: 1, label: "Boat Details", icon: Anchor },
  { id: 2, label: "Services", icon: Snowflake },
  { id: 3, label: "Review", icon: CalculatorIcon },
  { id: 4, label: "Contact", icon: User },
];

interface BoatDetails {
  length: string;
  type: string;
  trailerStorage: boolean;
}

interface ServiceSelections {
  shrinkWrap: boolean;
  indoorStorage: boolean;
  outdoorStorage: boolean;
  winterization: boolean;
  springRemoval: boolean;
  batteryStorage: boolean;
  batteryCount: number;
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  boatMakeModel: string;
  message: string;
}

interface LineItem {
  label: string;
  amount: number;
  note?: string;
}

function calculateTotal(boat: BoatDetails, services: ServiceSelections): LineItem[] {
  const len = parseFloat(boat.length) || 0;
  const items: LineItem[] = [];

  if (services.shrinkWrap && len > 0) {
    items.push({
      label: "Shrink Wrapping",
      amount: len * RATES.shrinkWrap,
      note: `${len} ft × $${RATES.shrinkWrap.toFixed(2)}/ft`,
    });
  }
  if (services.indoorStorage && len > 0) {
    items.push({
      label: "Indoor Storage (season)",
      amount: len * RATES.indoorStorage,
      note: `${len} ft × $${RATES.indoorStorage.toFixed(2)}/ft`,
    });
  }
  if (services.outdoorStorage && len > 0) {
    items.push({
      label: "Outdoor Storage (season)",
      amount: len * RATES.outdoorStorage,
      note: `${len} ft × $${RATES.outdoorStorage.toFixed(2)}/ft`,
    });
  }
  if (services.winterization) {
    items.push({
      label: "Winterization Package",
      amount: RATES.winterization,
      note: "Flat rate",
    });
  }
  if (services.springRemoval && len > 0) {
    items.push({
      label: "Spring Shrink Wrap Removal",
      amount: len * RATES.springRemoval,
      note: `${len} ft × $${RATES.springRemoval.toFixed(2)}/ft`,
    });
  }
  if (services.batteryStorage && services.batteryCount > 0) {
    items.push({
      label: `Battery Storage (×${services.batteryCount})`,
      amount: RATES.batteryStorage * services.batteryCount,
      note: `${services.batteryCount} × $${RATES.batteryStorage}/battery`,
    });
  }
  if (boat.trailerStorage) {
    items.push({
      label: "Trailer Storage (season)",
      amount: RATES.trailerStorage,
      note: "Flat rate",
    });
  }
  return items;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function Calculator() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const [boat, setBoat] = useState<BoatDetails>({
    length: "",
    type: "",
    trailerStorage: false,
  });

  const [services, setServices] = useState<ServiceSelections>({
    shrinkWrap: false,
    indoorStorage: false,
    outdoorStorage: false,
    winterization: false,
    springRemoval: false,
    batteryStorage: false,
    batteryCount: 1,
  });

  const [contact, setContact] = useState<ContactInfo>({
    name: "",
    email: "",
    phone: "",
    boatMakeModel: "",
    message: "",
  });

  const lineItems = calculateTotal(boat, services);
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const hst = subtotal * 0.13;
  const total = subtotal + hst;
  const hasSelections = lineItems.length > 0;

  const canProceedStep1 = boat.length !== "" && parseFloat(boat.length) > 0 && boat.type !== "";
  const canProceedStep2 = hasSelections;
  const canProceedStep3 = true;
  const canSubmit = contact.name !== "" && contact.email !== "" && contact.phone !== "";

  function handleSubmit() {
    // In production, this would POST to a form backend (Formspree, etc.)
    // For now, simulate submission
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[oklch(0.12_0.018_240)] flex items-center justify-center pt-20">
        <div className="container max-w-xl mx-auto text-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[oklch(0.85_0.18_195)/10] mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-[oklch(0.85_0.18_195)]" />
          </div>
          <h1
            className="text-4xl font-black text-white mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Quote Request Received!
          </h1>
          <p className="text-base text-white/65 mb-4">
            Thanks, <strong className="text-white">{contact.name}</strong>! We've received your storage quote request and will be in touch within 1–2 business days to confirm your booking.
          </p>
          <div className="marine-card p-5 mb-8 text-left">
            <p className="text-sm font-semibold text-white mb-3">Your Estimate Summary</p>
            {lineItems.map((item) => (
              <div key={item.label} className="flex justify-between text-sm text-white/65 py-1 border-b border-white/5">
                <span>{item.label}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm text-white/50 py-1">
              <span>HST (13%)</span>
              <span>{formatCurrency(hst)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[oklch(0.85_0.18_195)] pt-2 border-t border-white/10">
              <span>Estimated Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <p className="text-xs text-white/40 mb-8">
            This is an estimate only. Final pricing will be confirmed based on your boat's make, model, configuration, and an on-site assessment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)]"
            >
              <Link href="/">Back to Home</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 text-white/80 hover:border-white/40 hover:text-white"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.12_0.018_240)]">
      {/* Page Header */}
      <section className="pt-24 pb-8 bg-black border-b border-white/10">
        <div className="container max-w-7xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[oklch(0.85_0.18_195)] mb-2">
            Instant Estimate
          </p>
          <h1
            className="text-4xl font-black text-white md:text-5xl"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Storage Quote Calculator
          </h1>
          <p className="mt-2 text-base text-white/55">
            Build your custom storage package and get an instant estimate in under 2 minutes.
          </p>
        </div>
      </section>

      {/* Progress Bar */}
      <div className="bg-black border-b border-white/10 sticky top-16 z-40">
        <div className="container max-w-7xl mx-auto py-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)]"
                        : isDone
                        ? "bg-[oklch(0.85_0.18_195)/15] text-[oklch(0.85_0.18_195)]"
                        : "bg-white/5 text-white/40"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px w-6 ${step > s.id ? "bg-[oklch(0.85_0.18_195)/40]" : "bg-white/10"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Step Content */}
          <div>
            {/* STEP 1: Boat Details */}
            {step === 1 && (
              <div className="marine-card p-6 md:p-8">
                <h2
                  className="text-2xl font-black text-white mb-6"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Step 1 — Boat Details
                </h2>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-semibold text-white/80 mb-2 block">
                      Boat Length (feet) <span className="text-[oklch(0.85_0.18_195)]">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="10"
                      max="80"
                      placeholder="e.g. 24"
                      value={boat.length}
                      onChange={(e) => setBoat({ ...boat, length: e.target.value })}
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                    />
                    <p className="text-xs text-white/40 mt-1.5">Enter your boat's LOA (Length Overall) in feet</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-white/80 mb-2 block">
                      Boat Type <span className="text-[oklch(0.85_0.18_195)]">*</span>
                    </Label>
                    <Select value={boat.type} onValueChange={(val) => setBoat({ ...boat, type: val })}>
                      <SelectTrigger className="bg-white/5 border-white/15 text-white h-12 focus:border-[oklch(0.85_0.18_195)]">
                        <SelectValue placeholder="Select boat type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[oklch(0.16_0.018_240)] border-white/15">
                        {BOAT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-white focus:bg-white/10">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <Checkbox
                      id="trailer"
                      checked={boat.trailerStorage}
                      onCheckedChange={(checked) => setBoat({ ...boat, trailerStorage: !!checked })}
                      className="mt-0.5 border-white/30 data-[state=checked]:bg-[oklch(0.85_0.18_195)] data-[state=checked]:border-[oklch(0.85_0.18_195)]"
                    />
                    <div>
                      <Label htmlFor="trailer" className="text-sm font-semibold text-white cursor-pointer">
                        Add Trailer Storage
                      </Label>
                      <p className="text-xs text-white/50 mt-0.5">
                        Store your boat trailer at our facility — {formatCurrency(RATES.trailerStorage)}/season (flat rate)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] disabled:opacity-40 disabled:cursor-not-allowed btn-cyan-glow"
                  >
                    Next: Choose Services
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Services */}
            {step === 2 && (
              <div className="marine-card p-6 md:p-8">
                <h2
                  className="text-2xl font-black text-white mb-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Step 2 — Select Services
                </h2>
                <p className="text-sm text-white/50 mb-6">
                  Boat: {boat.length} ft {BOAT_TYPES.find(t => t.value === boat.type)?.label}
                </p>

                <div className="space-y-3">
                  {[
                    {
                      key: "shrinkWrap" as const,
                      icon: Snowflake,
                      title: "Shrink Wrapping",
                      desc: "Professional heat-shrink film with ventilation ports",
                      price: `${formatCurrency(parseFloat(boat.length || "0") * RATES.shrinkWrap)}`,
                      priceNote: `${boat.length || "0"} ft × $${RATES.shrinkWrap.toFixed(2)}/ft`,
                    },
                    {
                      key: "indoorStorage" as const,
                      icon: Shield,
                      title: "Indoor Storage",
                      desc: "Secure indoor storage in our clean, well-lit building",
                      price: `${formatCurrency(parseFloat(boat.length || "0") * RATES.indoorStorage)}`,
                      priceNote: `${boat.length || "0"} ft × $${RATES.indoorStorage.toFixed(2)}/ft/season`,
                    },
                    {
                      key: "outdoorStorage" as const,
                      icon: Shield,
                      title: "Outdoor Storage",
                      desc: "Economical outdoor storage on our secured, fenced lot",
                      price: `${formatCurrency(parseFloat(boat.length || "0") * RATES.outdoorStorage)}`,
                      priceNote: `${boat.length || "0"} ft × $${RATES.outdoorStorage.toFixed(2)}/ft/season`,
                    },
                    {
                      key: "winterization" as const,
                      icon: Wrench,
                      title: "Winterization Package",
                      desc: "Engine flush, fogging, antifreeze, fuel stabilizer, battery disconnect",
                      price: formatCurrency(RATES.winterization),
                      priceNote: "Flat rate",
                    },
                    {
                      key: "springRemoval" as const,
                      icon: Sun,
                      title: "Spring Shrink Wrap Removal",
                      desc: "Wrap removal, disposal, and spring inspection",
                      price: `${formatCurrency(parseFloat(boat.length || "0") * RATES.springRemoval)}`,
                      priceNote: `${boat.length || "0"} ft × $${RATES.springRemoval.toFixed(2)}/ft`,
                    },
                  ].map((service) => {
                    const Icon = service.icon;
                    const isSelected = services[service.key];
                    // Prevent both indoor and outdoor from being selected
                    const isDisabled =
                      (service.key === "indoorStorage" && services.outdoorStorage) ||
                      (service.key === "outdoorStorage" && services.indoorStorage);

                    return (
                      <div
                        key={service.key}
                        onClick={() => {
                          if (isDisabled) return;
                          setServices({ ...services, [service.key]: !isSelected });
                        }}
                        className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                          isDisabled
                            ? "opacity-40 cursor-not-allowed border-white/5 bg-white/2"
                            : isSelected
                            ? "border-[oklch(0.85_0.18_195)/50] bg-[oklch(0.85_0.18_195)/8]"
                            : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isSelected ? "bg-[oklch(0.85_0.18_195)/15]" : "bg-white/5"
                        }`}>
                          <Icon className={`h-5 w-5 ${isSelected ? "text-[oklch(0.85_0.18_195)]" : "text-white/40"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{service.title}</p>
                          <p className="text-xs text-white/50 mt-0.5">{service.desc}</p>
                          {isDisabled && (
                            <p className="text-xs text-yellow-400/60 mt-0.5">
                              Cannot select both indoor and outdoor storage
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-[oklch(0.85_0.18_195)]">{service.price}</p>
                          <p className="text-xs text-white/40">{service.priceNote}</p>
                        </div>
                        <div className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-[oklch(0.85_0.18_195)] bg-[oklch(0.85_0.18_195)]"
                            : "border-white/20"
                        }`}>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.12_0.018_240)]" />}
                        </div>
                      </div>
                    );
                  })}

                  {/* Battery Storage */}
                  <div
                    className={`rounded-xl border p-4 transition-all ${
                      services.batteryStorage
                        ? "border-[oklch(0.85_0.18_195)/50] bg-[oklch(0.85_0.18_195)/8]"
                        : "border-white/10 bg-white/3"
                    }`}
                  >
                    <div
                      className="flex items-center gap-4 cursor-pointer"
                      onClick={() => setServices({ ...services, batteryStorage: !services.batteryStorage })}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        services.batteryStorage ? "bg-[oklch(0.85_0.18_195)/15]" : "bg-white/5"
                      }`}>
                        <Battery className={`h-5 w-5 ${services.batteryStorage ? "text-[oklch(0.85_0.18_195)]" : "text-white/40"}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">Battery Storage</p>
                        <p className="text-xs text-white/50 mt-0.5">Removed, stored on trickle charger, reinstalled in spring</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[oklch(0.85_0.18_195)]">
                          {formatCurrency(RATES.batteryStorage * services.batteryCount)}
                        </p>
                        <p className="text-xs text-white/40">${RATES.batteryStorage}/battery</p>
                      </div>
                      <div className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        services.batteryStorage
                          ? "border-[oklch(0.85_0.18_195)] bg-[oklch(0.85_0.18_195)]"
                          : "border-white/20"
                      }`}>
                        {services.batteryStorage && <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.12_0.018_240)]" />}
                      </div>
                    </div>
                    {services.batteryStorage && (
                      <div className="mt-4 flex items-center gap-3 pl-14">
                        <Label className="text-xs text-white/60 shrink-0">Number of batteries:</Label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setServices({ ...services, batteryCount: Math.max(1, services.batteryCount - 1) })}
                            className="h-8 w-8 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 flex items-center justify-center text-sm font-bold"
                          >
                            −
                          </button>
                          <span className="text-sm font-bold text-white w-6 text-center">{services.batteryCount}</span>
                          <button
                            onClick={() => setServices({ ...services, batteryCount: Math.min(5, services.batteryCount + 1) })}
                            className="h-8 w-8 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 flex items-center justify-center text-sm font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2}
                    className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] disabled:opacity-40 btn-cyan-glow"
                  >
                    Next: Review
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
              <div className="marine-card p-6 md:p-8">
                <h2
                  className="text-2xl font-black text-white mb-6"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Step 3 — Review Your Selections
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="rounded-xl border border-white/10 bg-white/3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-3">Boat Details</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-white/50">Length</p>
                        <p className="text-white font-semibold">{boat.length} ft</p>
                      </div>
                      <div>
                        <p className="text-white/50">Type</p>
                        <p className="text-white font-semibold">{BOAT_TYPES.find(t => t.value === boat.type)?.label}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-3">Selected Services</p>
                    <div className="space-y-2">
                      {lineItems.map((item) => (
                        <div key={item.label} className="flex justify-between items-center text-sm">
                          <div>
                            <p className="text-white">{item.label}</p>
                            <p className="text-xs text-white/40">{item.note}</p>
                          </div>
                          <p className="text-[oklch(0.85_0.18_195)] font-semibold">{formatCurrency(item.amount)}</p>
                        </div>
                      ))}
                      {lineItems.length === 0 && (
                        <p className="text-sm text-white/40">No services selected</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[oklch(0.85_0.18_195)/20] bg-[oklch(0.85_0.18_195)/5] p-4 mb-6">
                  <div className="flex justify-between text-sm text-white/60 mb-1">
                    <span>Subtotal (before HST)</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/60 mb-2">
                    <span>HST (13%)</span>
                    <span>{formatCurrency(hst)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-[oklch(0.85_0.18_195)] border-t border-white/10 pt-2">
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Estimated Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 mb-6 flex gap-2">
                  <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300/80">
                    This is an estimate only. Final pricing will be confirmed based on your boat's make, model, configuration, and an on-site assessment. HST included in estimate above.
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] btn-cyan-glow"
                  >
                    Next: Submit Request
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Contact */}
            {step === 4 && (
              <div className="marine-card p-6 md:p-8">
                <h2
                  className="text-2xl font-black text-white mb-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Step 4 — Submit Your Request
                </h2>
                <p className="text-sm text-white/50 mb-6">
                  This is a quote request, not a payment. We'll contact you to confirm your booking.
                </p>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-semibold text-white/80 mb-2 block">
                        Full Name <span className="text-[oklch(0.85_0.18_195)]">*</span>
                      </Label>
                      <Input
                        placeholder="John Smith"
                        value={contact.name}
                        onChange={(e) => setContact({ ...contact, name: e.target.value })}
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-white/80 mb-2 block">
                        Email <span className="text-[oklch(0.85_0.18_195)]">*</span>
                      </Label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={contact.email}
                        onChange={(e) => setContact({ ...contact, email: e.target.value })}
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-sm font-semibold text-white/80 mb-2 block">
                        Phone <span className="text-[oklch(0.85_0.18_195)]">*</span>
                      </Label>
                      <Input
                        type="tel"
                        placeholder="(705) 555-1234"
                        value={contact.phone}
                        onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-white/80 mb-2 block">
                        Boat Make & Model
                      </Label>
                      <Input
                        placeholder="e.g. 2018 Chaparral 23 H2O"
                        value={contact.boatMakeModel}
                        onChange={(e) => setContact({ ...contact, boatMakeModel: e.target.value })}
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] h-12"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-white/80 mb-2 block">
                      Additional Notes
                    </Label>
                    <Textarea
                      placeholder="Any special requirements, questions, or preferred dates..."
                      value={contact.message}
                      onChange={(e) => setContact({ ...contact, message: e.target.value })}
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-[oklch(0.85_0.18_195)] min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button
                    onClick={() => setStep(3)}
                    variant="outline"
                    className="border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] disabled:opacity-40 btn-cyan-glow"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit Quote Request
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Price Panel */}
          <div className="lg:sticky lg:top-40 lg:self-start">
            <div className="marine-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-white">Estimated Total</p>
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
                >
                  {showBreakdown ? "Hide" : "Show"} breakdown
                  {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {showBreakdown && lineItems.length > 0 && (
                <div className="space-y-2 mb-4 pb-4 border-b border-white/10">
                  {lineItems.map((item) => (
                    <div key={item.label} className="flex justify-between text-xs">
                      <span className="text-white/55">{item.label}</span>
                      <span className="text-white/80 font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-white/40">HST (13%)</span>
                    <span className="text-white/55">{formatCurrency(hst)}</span>
                  </div>
                </div>
              )}

              <div className="text-center py-2">
                <p
                  className="text-4xl font-black text-[oklch(0.85_0.18_195)]"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {hasSelections ? formatCurrency(total) : "$0.00"}
                </p>
                <p className="text-xs text-white/40 mt-1">inc. HST · estimate only</p>
              </div>

              {!hasSelections && (
                <p className="text-center text-xs text-white/40 mt-2">
                  Select services to see your estimate
                </p>
              )}

              {hasSelections && step < 4 && (
                <Button
                  onClick={() => setStep(4)}
                  className="w-full mt-4 bg-[oklch(0.85_0.18_195)] text-[oklch(0.12_0.018_240)] font-semibold hover:bg-[oklch(0.78_0.18_195)] btn-cyan-glow"
                >
                  Submit Quote Request
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/35 leading-relaxed">
                  ⚠️ Rates shown are placeholders. This is an estimate only. Final pricing confirmed after on-site assessment.
                </p>
              </div>
            </div>

            {/* Service area */}
            <div className="marine-card p-4 mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-2">Service Area</p>
              <p className="text-xs text-white/55 leading-relaxed">
                Tiny · Midland · Penetanguishene · Wasaga Beach · Georgian Bay · Lake Simcoe
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
