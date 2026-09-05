import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearDraft,
  DRAFT_KEY,
  DRAFT_TTL_MS,
  draftLabel,
  readDraft,
  saveDraft,
} from "./quote-draft";

const BOAT = {
  lengthFt: 24,
  hullType: "bowrider",
  engineType: "outboard" as const,
  engineCount: 1,
};

const DRAFT = {
  boat: BOAT,
  mode: "bundle" as const,
  bundleId: "winter_ready",
  alacarte: [],
  ceramicUpgrade: false,
  logisticsValue: {},
  resolvedBand: null,
  preferredWeek: null,
  launchTarget: null,
  step: 2,
};

// jsdom is not configured for this project, so stand in a minimal store.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saving and reading a draft", () => {
  it("round-trips", () => {
    saveDraft(DRAFT);
    const back = readDraft();
    expect(back?.boat.lengthFt).toBe(24);
    expect(back?.bundleId).toBe("winter_ready");
    expect(back?.step).toBe(2);
  });

  it("stamps savedAt", () => {
    saveDraft(DRAFT);
    expect(readDraft()!.savedAt).toBeGreaterThan(Date.now() - 5000);
  });

  it("returns null when there is nothing saved", () => {
    expect(readDraft()).toBeNull();
  });
});

describe("what is not worth offering back", () => {
  it("drops a draft older than 30 days — its prices have moved", () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...DRAFT, savedAt: Date.now() - DRAFT_TTL_MS - 1000 })
    );
    expect(readDraft()).toBeNull();
    // And CLEARS it, so the same dead draft is not re-checked forever.
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("drops a draft with no boat length — there is nothing to recognise", () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...DRAFT, boat: { lengthFt: 0 }, savedAt: Date.now() })
    );
    expect(readDraft()).toBeNull();
  });

  it("survives corrupted JSON rather than throwing into the calculator", () => {
    localStorage.setItem(DRAFT_KEY, "{not json");
    expect(readDraft()).toBeNull();
  });
});

describe("when storage itself is unavailable", () => {
  // Safari private mode and "block site data" both THROW on access. A
  // calculator that will not load because it could not save a draft is a much
  // worse bug than a lost draft.
  it("does not throw on read or write", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("SecurityError");
      },
      removeItem() {
        throw new Error("SecurityError");
      },
    });
    expect(() => saveDraft(DRAFT)).not.toThrow();
    expect(readDraft()).toBeNull();
    expect(() => clearDraft()).not.toThrow();
  });
});

describe("the resume prompt's wording", () => {
  it("names the boat when it can", () => {
    expect(draftLabel({ ...DRAFT, savedAt: Date.now() })).toBe(
      "your 24 ft bowrider quote"
    );
  });

  it("falls back without a hull type", () => {
    expect(
      draftLabel({
        ...DRAFT,
        boat: { ...BOAT, hullType: "" },
        savedAt: Date.now(),
      })
    ).toBe("your 24 ft boat quote");
  });
});
