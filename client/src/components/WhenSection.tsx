// "When?" — the two dates a storage booking actually turns on.
//
// Both OPTIONAL. A customer who does not know yet must be able to carry on:
// skipping shows "we'll agree a date when we confirm", which is what happens
// anyway. Forcing a date here would cost real bookings to collect a guess.
//
// THE WEEK LIST IS NEVER INVENTED. It comes from the capacity table, and when
// that table is empty this section renders nothing at all rather than offering
// weeks the yard has not published. A greyed-out week means a real row said
// spots_reserved >= spots_total.
import { useEffect, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { LAUNCH_TARGET_VALUES, type LaunchTarget } from "@/lib/quote-items";
import { launchLabel, weekLabel } from "@shared/when-labels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CapacityWeek {
  weekStart: string;
  spotsLeft: number;
  full: boolean;
}

export interface CapacityPayload {
  ok?: boolean;
  season?: string | null;
  spotsLeft?: number | null;
  weeks?: CapacityWeek[];
}

/**
 * Spring launch windows, as the yard actually schedules them.
 *
 * Half-months rather than dates: nobody knows on 20 September which Tuesday in
 * April they want their boat back, and asking for one produces a number that
 * has to be renegotiated anyway. "flexible" is first-class, not a cop-out.
 */
// The picker says "I'm flexible" because the customer is choosing; the PDF and
// email say "Flexible" because they are reporting a choice already made.
const PICKER_LABELS: Record<LaunchTarget, string> = {
  early_april: "Early April",
  late_april: "Late April",
  early_may: "Early May",
  late_may: "Late May",
  flexible: "I'm flexible",
};

export const LAUNCH_TARGETS = LAUNCH_TARGET_VALUES.map(value => ({
  value,
  label: PICKER_LABELS[value],
}));

export type { LaunchTarget };

export const NO_WEEK = "__none__";

export { launchLabel, weekLabel };

interface Props {
  weekStart: string | null;
  launchTarget: LaunchTarget | null;
  onChange: (patch: {
    weekStart?: string | null;
    launchTarget?: LaunchTarget | null;
  }) => void;
}

export function WhenSection({ weekStart, launchTarget, onChange }: Props) {
  const [weeks, setWeeks] = useState<CapacityWeek[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/capacity");
        const data = (await res.json()) as CapacityPayload;
        if (!cancelled) setWeeks(data.weeks ?? []);
      } catch {
        // A capacity outage must not block the quote. No weeks, no section,
        // and the customer carries on to the next step.
        if (!cancelled) setWeeks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing published, nothing to ask. Rendering an empty picker would invite
  // a customer to choose from a list of no weeks.
  const hasWeeks = (weeks?.length ?? 0) > 0;
  if (loading) {
    return (
      <div className="marine-card flex items-center gap-2 p-5 text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
      </div>
    );
  }
  // The launch question stands on its own — it needs no capacity data — so the
  // section still renders when no weeks are published, with only that half.

  return (
    <div className="marine-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-[oklch(0.6_0.2_27)]" />
        <h3
          className="text-lg font-bold text-white"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          When?
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {hasWeeks && (
          <div>
            <Label className="text-white/70">Fall drop-off week</Label>
            <Select
              value={weekStart ?? NO_WEEK}
              onValueChange={v =>
                onChange({ weekStart: v === NO_WEEK ? null : v })
              }
            >
              <SelectTrigger className="mt-1.5 h-11 border-white/15 bg-white/5 text-white">
                <SelectValue placeholder="Not sure yet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_WEEK}>Not sure yet</SelectItem>
                {weeks!.map(w => (
                  <SelectItem
                    key={w.weekStart}
                    value={w.weekStart}
                    disabled={w.full}
                  >
                    {weekLabel(w.weekStart)}
                    {w.full
                      ? " — full"
                      : w.spotsLeft <= 3
                        ? ` — ${w.spotsLeft} left`
                        : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-white/70">Spring launch target</Label>
          <Select
            value={launchTarget ?? NO_WEEK}
            onValueChange={v =>
              onChange({
                launchTarget: v === NO_WEEK ? null : (v as LaunchTarget),
              })
            }
          >
            <SelectTrigger className="mt-1.5 h-11 border-white/15 bg-white/5 text-white">
              <SelectValue placeholder="Not sure yet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_WEEK}>Not sure yet</SelectItem>
              {LAUNCH_TARGETS.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="mt-3 text-xs text-white/40">
        {weekStart || launchTarget
          ? "We'll confirm these when we get back to you."
          : "Both optional — we'll agree a date when we confirm."}
      </p>
    </div>
  );
}
