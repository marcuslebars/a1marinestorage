import { afterEach, describe, expect, it } from "vitest";

import {
  ResumeTokenConfigError,
  decodeResumeToken,
  encodeResumeToken,
  resumeTokenSecretConfigured,
} from "./resume-token";

/**
 * The dev fallback key is a module constant committed to this repo. Signing with
 * it in production would let anyone mint a resume link, and verifying against it
 * would make the signature decorative — a tampered transport band would restore
 * a mispriced quote. So production must refuse rather than fall back.
 */

const STATE = { selection: { mode: "bundle", bundleId: "winter_ready" }, boat: { lengthFt: 24 } };

const ENV = process.env.NODE_ENV;
const SECRET = process.env.RESUME_TOKEN_SECRET;

afterEach(() => {
  process.env.NODE_ENV = ENV;
  if (SECRET === undefined) delete process.env.RESUME_TOKEN_SECRET;
  else process.env.RESUME_TOKEN_SECRET = SECRET;
});

describe("production refuses the development key", () => {
  it("will not SIGN a token without a configured secret", () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESUME_TOKEN_SECRET;
    expect(() => encodeResumeToken(STATE)).toThrow(ResumeTokenConfigError);
  });

  it("will not VERIFY one either", () => {
    // Both directions matter. Refusing to sign but still accepting dev-signed
    // tokens would leave the forgery path wide open.
    process.env.NODE_ENV = "test";
    const forged = encodeResumeToken(STATE);
    process.env.NODE_ENV = "production";
    delete process.env.RESUME_TOKEN_SECRET;
    expect(() => decodeResumeToken(forged)).toThrow(ResumeTokenConfigError);
  });

  it("works normally once the secret is set", () => {
    process.env.NODE_ENV = "production";
    process.env.RESUME_TOKEN_SECRET = "a-real-production-secret";
    const back = decodeResumeToken(encodeResumeToken(STATE));
    expect(back.selection).toEqual(STATE.selection);
  });

  it("rejects a token minted with the dev key, proving the keys really differ", () => {
    process.env.NODE_ENV = "test";
    delete process.env.RESUME_TOKEN_SECRET;
    const devSigned = encodeResumeToken(STATE);

    process.env.NODE_ENV = "production";
    process.env.RESUME_TOKEN_SECRET = "a-real-production-secret";
    // If this ever passes, the fallback is leaking into the production path.
    expect(() => decodeResumeToken(devSigned)).toThrow(/signature/i);
  });
});

describe("dev and test keep the fallback", () => {
  it("round-trips with no secret configured at all", () => {
    process.env.NODE_ENV = "test";
    delete process.env.RESUME_TOKEN_SECRET;
    const back = decodeResumeToken(encodeResumeToken({ ...STATE, ref: "A1MS-Q-ABC123" }));
    expect(back.ref).toBe("A1MS-Q-ABC123");
  });
});

describe("the startup check", () => {
  it("reports a misconfigured production boot", () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESUME_TOKEN_SECRET;
    // Read at boot so a bad deploy is loud in the log, rather than discovered by
    // the first customer who presses Download.
    expect(resumeTokenSecretConfigured()).toBe(false);
  });

  it("is satisfied by a configured production boot", () => {
    process.env.NODE_ENV = "production";
    process.env.RESUME_TOKEN_SECRET = "a-real-production-secret";
    expect(resumeTokenSecretConfigured()).toBe(true);
  });

  it("never complains outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.RESUME_TOKEN_SECRET;
    expect(resumeTokenSecretConfigured()).toBe(true);
  });
});
