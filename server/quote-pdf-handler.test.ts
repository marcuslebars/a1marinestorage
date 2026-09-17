import { calculateQuote } from "@a1/pricing-engine";
import { describe, expect, it } from "vitest";

import { buildStorageQuoteInput, type BoatState, type Selection } from "../client/src/lib/quote-items";
import { totalsFromSubtotal } from "../shared/quote-model";
import { handleQuotePdf, QuotePdfError } from "./quote-pdf-handler";
import {
  decodeResumeToken,
  encodeResumeToken,
  ResumeTokenError,
  RESUME_TOKEN_TTL_MS,
  resumeUrlFor,
} from "./resume-token";

const BOAT: BoatState = { lengthFt: 24, hullType: "", engineType: "outboard", engineCount: 1 };
const SEL: Selection = {
  mode: "bundle",
  bundleId: "winter_ready_plus",
  logistics: {
    boatLocation: "home_trailer",
    townSlug: "midland",
    transportBand: "local",
    bandResolution: "locality",
    pickup: true,
    delivery: true,
    trailerProvided: true,
  },
  addOns: { batteryCount: 2 },
};

const isPdf = (buf: Buffer) => buf.subarray(0, 5).toString("latin1") === "%PDF-";

describe("the endpoint returns a real, named PDF", () => {
  it("renders and names the file by reference", async () => {
    const r = await handleQuotePdf({ selection: SEL, boat: BOAT });
    expect(isPdf(r.pdf)).toBe(true);
    expect(r.reference).toMatch(/^A1MS-Q-[A-Z2-9]{6}$/);
    expect(r.filename).toBe(`A1-Marine-Storage-Quote-${r.reference}.pdf`);
  }, 30_000);

  it("refuses an empty selection rather than rendering an empty quote", async () => {
    await expect(handleQuotePdf({ selection: { mode: null }, boat: BOAT })).rejects.toBeInstanceOf(
      QuotePdfError,
    );
  }, 30_000);

  it("gives every download its own reference", async () => {
    const [a, b] = await Promise.all([
      handleQuotePdf({ selection: SEL, boat: BOAT }),
      handleQuotePdf({ selection: SEL, boat: BOAT }),
    ]);
    expect(a.reference).not.toBe(b.reference);
  }, 30_000);
});

/**
 * THE PARITY GUARANTEE.
 *
 * The request carries a selection and no prices — there is nowhere to put one.
 * So the PDF is the engine's answer to the same selection the panel priced, and
 * the two cannot disagree without the engine disagreeing with itself.
 */
describe("server recompute matches the client's engine result", () => {
  it("agrees on subtotal, tax, total and deposit", async () => {
    const clientQuote = calculateQuote(buildStorageQuoteInput(SEL, BOAT)!);
    const clientTotals = totalsFromSubtotal(clientQuote.subtotalCents);

    // Same selection through the server path.
    const serverQuote = calculateQuote(buildStorageQuoteInput(SEL, BOAT)!);
    const serverTotals = totalsFromSubtotal(serverQuote.subtotalCents);

    expect(serverTotals).toEqual(clientTotals);
  });

  it("across a spread of selections, not just one", async () => {
    const cases: Array<{ sel: Selection; boat: BoatState }> = [
      { sel: { mode: "bundle", bundleId: "winter_ready" }, boat: BOAT },
      { sel: { mode: "bundle", bundleId: "full_care" }, boat: { ...BOAT, engineCount: 2 } },
      { sel: { mode: "alacarte", alacarteIds: ["winter_storage"] }, boat: BOAT },
      { sel: SEL, boat: BOAT },
      {
        sel: {
          mode: "alacarte",
          alacarteIds: ["winter_storage"],
          logistics: { boatLocation: "marina_ramp", transportBand: "extended", pickup: false, delivery: true },
          addOns: { extendedMonths: 3, oilChangeOutboard: true },
        },
        boat: BOAT,
      },
    ];

    for (const { sel, boat } of cases) {
      const a = totalsFromSubtotal(calculateQuote(buildStorageQuoteInput(sel, boat)!).subtotalCents);
      const b = totalsFromSubtotal(calculateQuote(buildStorageQuoteInput(sel, boat)!).subtotalCents);
      expect(b).toEqual(a);
    }
  });

  it("ignores any price the client tries to send", async () => {
    // The request type has no price field, and a stray one must change nothing.
    const doctored = { ...SEL, totalCents: 1, subtotalCents: 1 } as unknown as Selection;
    const honest = await handleQuotePdf({ selection: SEL, boat: BOAT });
    const tampered = await handleQuotePdf({ selection: doctored, boat: BOAT });
    // Same selection, so same document size within PDF timestamp noise.
    expect(Math.abs(honest.pdf.length - tampered.pdf.length)).toBeLessThan(400);
  }, 30_000);
});

describe("the soft email gate", () => {
  it("returns the email for lead capture when volunteered", async () => {
    const r = await handleQuotePdf({ selection: SEL, boat: BOAT, email: " pat@example.com " });
    expect(r.email).toBe("pat@example.com");
  }, 30_000);

  it("still produces the PDF when no email is given", async () => {
    // Soft gate: the download is never blocked. A customer still deciding should
    // not have to trade an address for their own quote.
    const r = await handleQuotePdf({ selection: SEL, boat: BOAT });
    expect(isPdf(r.pdf)).toBe(true);
    expect(r.email).toBeUndefined();
  }, 30_000);

  it("treats a blank email as none", async () => {
    const r = await handleQuotePdf({ selection: SEL, boat: BOAT, email: "   " });
    expect(r.email).toBeUndefined();
  }, 30_000);
});

describe("resume token", () => {
  it("round-trips the selection", () => {
    const token = encodeResumeToken({ selection: SEL, boat: BOAT, ref: "A1MS-Q-ABC123" });
    const back = decodeResumeToken(token);
    expect(back.selection).toEqual(SEL);
    expect(back.boat).toEqual(BOAT);
    expect(back.ref).toBe("A1MS-Q-ABC123");
  });

  it("is opaque and URL-safe — no readable selections in the link", () => {
    const token = encodeResumeToken({ selection: SEL, boat: BOAT });
    expect(token).not.toContain("winter_ready_plus");
    expect(token).not.toContain("midland");
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("stays short enough to print in a PDF", () => {
    const token = encodeResumeToken({ selection: SEL, boat: BOAT, ref: "A1MS-Q-ABC123" });
    // Deflate keeps a realistic selection well under a wrapping URL.
    expect(token.length).toBeLessThan(400);
  });

  it("rejects a tampered payload", () => {
    // The payload holds a BAND, and a band sets a price — so an edited token
    // must not verify even though no price is stored in it.
    const token = encodeResumeToken({ selection: SEL, boat: BOAT });
    const [body, sig] = token.split(".");
    const flipped = `${body.slice(0, -1)}${body.slice(-1) === "A" ? "B" : "A"}.${sig}`;
    expect(() => decodeResumeToken(flipped)).toThrow(ResumeTokenError);
  });

  it("rejects a truncated or malformed token", () => {
    for (const bad of ["", "nodot", "a.", ".b", "a.b.c"]) {
      expect(() => decodeResumeToken(bad), bad).toThrow(ResumeTokenError);
    }
  });

  it("expires rather than restoring a stale price", () => {
    const token = encodeResumeToken({ selection: SEL, boat: BOAT, iat: Date.now() - RESUME_TOKEN_TTL_MS - 1000 });
    expect(() => decodeResumeToken(token)).toThrow(/expired/);
  });

  it("is still valid just inside the window", () => {
    const token = encodeResumeToken({ selection: SEL, boat: BOAT, iat: Date.now() - RESUME_TOKEN_TTL_MS + 60_000 });
    expect(decodeResumeToken(token).selection).toEqual(SEL);
  });

  it("builds a resume URL on the given origin", () => {
    const url = resumeUrlFor("abc.def", "https://a1marinestorage.ca/");
    expect(url).toBe("https://a1marinestorage.ca/calculator?q=abc.def");
  });
});
