import { afterEach, describe, expect, it } from "vitest";

import {
  __clearCapacityCache,
  getCapacity,
  isMondayIso,
  mondayOf,
  shouldShowSpotsLeft,
} from "./capacity";

afterEach(() => {
  __clearCapacityCache();
  delete process.env.DATABASE_URL;
});

describe("Monday anchoring", () => {
  // A week needs ONE identity. Without this, "the week of the 14th" resolves
  // differently depending on which day the customer clicked, and two people
  // reserve what looks like two different weeks.
  it.each([
    ["2026-09-21", "2026-09-21"], // Monday itself
    ["2026-09-22", "2026-09-21"], // Tuesday
    ["2026-09-25", "2026-09-21"], // Friday
    ["2026-09-27", "2026-09-21"], // Sunday belongs to the week that started
    ["2026-09-28", "2026-09-28"], // next Monday
  ])("maps %s to %s", (input, expected) => {
    expect(mondayOf(new Date(`${input}T00:00:00Z`))).toBe(expected);
  });

  it("does not drift across a month or year boundary", () => {
    expect(mondayOf(new Date("2027-01-01T00:00:00Z"))).toBe("2026-12-28");
  });

  it("is stable regardless of the time of day", () => {
    expect(mondayOf(new Date("2026-09-25T23:59:59Z"))).toBe("2026-09-21");
    expect(mondayOf(new Date("2026-09-25T00:00:00Z"))).toBe("2026-09-21");
  });
});

describe("validating a submitted week", () => {
  it("accepts a Monday", () => {
    expect(isMondayIso("2026-09-21")).toBe(true);
  });

  it("rejects a non-Monday, so a hand-crafted body cannot invent a week", () => {
    expect(isMondayIso("2026-09-22")).toBe(false);
  });

  it("rejects rubbish", () => {
    expect(isMondayIso("not-a-date")).toBe(false);
    expect(isMondayIso("2026-13-45")).toBe(false);
    expect(isMondayIso(undefined)).toBe(false);
    expect(isMondayIso(20260921)).toBe(false);
  });
});

describe("with no database", () => {
  it("reports nothing rather than zero", async () => {
    // Zero means "we are full". Null means "we have not published
    // availability". Telling a customer the first when the second is true
    // would turn them away from a yard with room.
    const c = await getCapacity();
    expect(c.spotsLeft).toBeNull();
    expect(c.season).toBeNull();
    expect(c.weeks).toEqual([]);
  });

  it("never shows the counter", async () => {
    const c = await getCapacity();
    expect(shouldShowSpotsLeft(c.spotsLeft)).toBe(false);
  });
});

describe("when to show the counter at all", () => {
  it("shows a real, meaningful number", () => {
    expect(shouldShowSpotsLeft(1)).toBe(true);
    expect(shouldShowSpotsLeft(12)).toBe(true);
    expect(shouldShowSpotsLeft(40)).toBe(true);
  });

  it("stays silent when there is nothing to say", () => {
    expect(shouldShowSpotsLeft(null)).toBe(false);
    // Zero is a real answer, but "0 spots left" on a marketing page reads as
    // "go away" — the yard would rather take the call.
    expect(shouldShowSpotsLeft(0)).toBe(false);
  });

  it("stays silent when the number is too big to mean anything", () => {
    // "412 spots left" is not scarcity, it is noise, and it makes the yard
    // look empty.
    expect(shouldShowSpotsLeft(41)).toBe(false);
    expect(shouldShowSpotsLeft(412)).toBe(false);
  });

  it("never shows a negative", () => {
    expect(shouldShowSpotsLeft(-3)).toBe(false);
  });
});

describe("when the database is unreachable", () => {
  it("degrades to silence instead of throwing", async () => {
    process.env.DATABASE_URL =
      "postgres://nobody@127.0.0.1:1/none?sslmode=disable";
    __clearCapacityCache();
    const c = await getCapacity();
    expect(c.spotsLeft).toBeNull();
    expect(c.weeks).toEqual([]);
  }, 20000);
});
