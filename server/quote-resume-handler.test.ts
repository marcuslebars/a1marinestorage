// 1.2 — the resume link printed on every PDF used to go nowhere.
//
// `resumeUrlFor` has always produced `/calculator?q=<token>` and the PDF has
// always printed it. There was no endpoint to decode the token and nothing in
// the client that read `?q=`, so the link opened an EMPTY calculator — the
// customer came back to finish their quote and found a blank form.
import { describe, expect, it } from "vitest";

import { handleQuoteResume } from "./quote-resume-handler";
import { encodeResumeToken, RESUME_TOKEN_TTL_MS } from "./resume-token";

const SELECTION = {
  mode: "bundle",
  bundleId: "winter_ready",
  alacarteIds: [],
  ceramicUpgrade: false,
  logistics: {
    boatLocation: "home_trailer",
    townSlug: "midland",
    transportBand: "local",
    distanceKm: 12,
    bandResolution: "locality",
    pickup: true,
    delivery: true,
  },
};
const BOAT = {
  lengthFt: 24,
  hullType: "bowrider",
  engineType: "outboard",
  engineCount: 1,
};

describe("resuming a quote from the link on the PDF", () => {
  it("round-trips the selection, the boat and the reference", () => {
    const token = encodeResumeToken({
      selection: SELECTION,
      boat: BOAT,
      ref: "A1MS-Q-ABC123",
    });
    const res = handleQuoteResume(token);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.selection).toEqual(SELECTION);
    expect(res.body.boat).toEqual(BOAT);
    expect(res.body.ref).toBe("A1MS-Q-ABC123");
  });

  it("returns no prices — the calculator re-prices through the engine on arrival", () => {
    const token = encodeResumeToken({ selection: SELECTION, boat: BOAT });
    const body = JSON.stringify(handleQuoteResume(token).body);
    expect(body).not.toMatch(/subtotalCents|amountCents|unitPriceCents/);
  });

  it("answers 400 for a malformed token", () => {
    const res = handleQuoteResume("not-a-token");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("malformed");
  });

  it("answers 400 for a token whose payload was edited", () => {
    const token = encodeResumeToken({ selection: SELECTION, boat: BOAT });
    const [body, sig] = token.split(".");
    const tampered = `${body.slice(0, -2)}AA.${sig}`;
    const res = handleQuoteResume(tampered);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("bad_signature");
  });

  it("answers 410, not 400, for an expired link — expiry is an outcome, not an error", () => {
    const token = encodeResumeToken({
      selection: SELECTION,
      boat: BOAT,
      iat: Date.now() - RESUME_TOKEN_TTL_MS - 1000,
    });
    const res = handleQuoteResume(token);
    expect(res.status).toBe(410);
    expect(res.body.code).toBe("expired");
    // The boat comes back anyway. Expiry and authenticity are different
    // questions: this is still a token WE signed, so the boat in it is
    // trustworthy and only the prices are stale. Returning it is what lets the
    // calculator prefill Step 2 instead of handing back an empty form.
    expect(res.body.boat).toEqual(BOAT);
    // The SELECTION is not returned: re-picking a package is how the customer
    // sees current prices rather than a remembered choice shown as current.
    expect(res.body.selection).toBeUndefined();
  });

  it("answers 400 when the link has no token at all", () => {
    expect(handleQuoteResume(undefined).status).toBe(400);
    expect(handleQuoteResume("").status).toBe(400);
  });
});
