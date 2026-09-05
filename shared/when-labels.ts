// How a requested date is worded, in one place.
//
// The screen, the PDF and the confirmation email all show these, and three
// copies of "Week of Mon 21 Sept" is three chances for them to disagree about
// the same date. Pure and dependency-free so the server can use it too.
import {
  LAUNCH_TARGET_VALUES,
  type LaunchTarget,
} from "../client/src/lib/quote-items";

const LAUNCH_LABELS: Record<LaunchTarget, string> = {
  early_april: "Early April",
  late_april: "Late April",
  early_may: "Early May",
  late_may: "Late May",
  flexible: "Flexible",
};

/** "Week of Mon 21 Sept" — the way a person says it out loud. */
export function weekLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `Week of ${d.toLocaleDateString("en-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    // UTC, because the week is anchored in UTC. Formatting in local time is
    // how "Mon 21 Sept" becomes "Sun 20 Sept" on a server west of here.
    timeZone: "UTC",
  })}`;
}

export function launchLabel(value: string | null | undefined): string | null {
  return value && (LAUNCH_TARGET_VALUES as readonly string[]).includes(value)
    ? LAUNCH_LABELS[value as LaunchTarget]
    : null;
}
