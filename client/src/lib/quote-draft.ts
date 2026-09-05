// The quote you were building, kept in this browser.
//
// Nothing here leaves the device. It is a convenience for the person who
// closed the tab, not a lead-capture mechanism — the server never sees it, and
// there is deliberately no identifier in it.
//
// EVERY read and write is wrapped. localStorage throws outright in Safari
// private mode and when a browser is set to block site data, and a calculator
// that will not load because it could not save a draft is a far worse bug than
// a lost draft.
import type { BoatState } from "@/lib/quote-items";

export const DRAFT_KEY = "a1ms.quote.v1";

/** Older than this and the prices are stale enough that resuming misleads. */
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface QuoteDraft {
  boat: BoatState;
  mode: "bundle" | "alacarte" | null;
  bundleId: string | null;
  alacarte: string[];
  ceramicUpgrade: boolean;
  logisticsValue: unknown;
  resolvedBand: unknown;
  preferredWeek: string | null;
  launchTarget: string | null;
  step: number;
  savedAt: number;
}

/** Is there enough here to be worth offering back? */
function isUsable(d: QuoteDraft | null): d is QuoteDraft {
  if (!d || typeof d.savedAt !== "number") return false;
  if (Date.now() - d.savedAt > DRAFT_TTL_MS) return false;
  // A length is the minimum that makes "continue your 24 ft bowrider quote?"
  // a sentence. Without one there is nothing to recognise.
  return Boolean(d.boat?.lengthFt);
}

export function saveDraft(draft: Omit<QuoteDraft, "savedAt">): void {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
  } catch {
    /* Private mode, blocked storage, quota. None of it is worth an error. */
  }
}

export function readDraft(): QuoteDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteDraft;
    if (!isUsable(parsed)) {
      // Expired or unusable: clear it so the same dead draft is not re-checked
      // on every visit for the rest of time.
      clearDraft();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* Nothing to do about it. */
  }
}

/** "your 24 ft bowrider quote" — what the resume prompt calls it. */
export function draftLabel(d: QuoteDraft): string {
  const len = d.boat?.lengthFt;
  const hull = d.boat?.hullType;
  if (len && hull) return `your ${len} ft ${hull} quote`;
  if (len) return `your ${len} ft boat quote`;
  return "your saved quote";
}
