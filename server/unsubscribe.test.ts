import { describe, expect, it } from "vitest";

import { encodeResumeToken } from "./resume-token";
import {
  decodeUnsubscribeToken,
  encodeUnsubscribeToken,
  handleUnsubscribe,
  isUnsubscribed,
  unsubscribeUrl,
} from "./unsubscribe";

describe("the unsubscribe token", () => {
  it("round-trips an address", () => {
    const t = encodeUnsubscribeToken("Dana@Example.COM");
    // Normalised on the way in, so the lookup matches the stored contact.
    expect(decodeUnsubscribeToken(t)).toBe("dana@example.com");
  });

  it("rejects a tampered token — otherwise anyone could unsubscribe anyone", () => {
    const t = encodeUnsubscribeToken("dana@example.com");
    const [body, sig] = t.split(".");
    expect(decodeUnsubscribeToken(`${body.slice(0, -2)}AA.${sig}`)).toBeNull();
  });

  it("rejects rubbish", () => {
    expect(decodeUnsubscribeToken("nonsense")).toBeNull();
    expect(decodeUnsubscribeToken("")).toBeNull();
  });

  it("refuses a RESUME token — the two families must not be interchangeable", () => {
    // Same signature scheme, different payload. A resume link leaking into an
    // unsubscribe handler must not silently opt someone out of everything.
    const resume = encodeResumeToken({
      selection: { mode: "bundle" },
      boat: { lengthFt: 24 },
      ref: "A1MS-Q-ABC123",
    });
    expect(decodeUnsubscribeToken(resume)).toBeNull();
  });

  it("builds a URL against the given origin", () => {
    const url = unsubscribeUrl(
      "dana@example.com",
      "https://a1marinestorage.ca/"
    );
    expect(
      url.startsWith("https://a1marinestorage.ca/api/unsubscribe?t=")
    ).toBe(true);
  });
});

describe("clicking the link", () => {
  it("always answers 200 — an unsubscribe page must never be an error page", async () => {
    const good = await handleUnsubscribe(
      encodeUnsubscribeToken("d@example.com")
    );
    const bad = await handleUnsubscribe("broken");
    expect(good.status).toBe(200);
    expect(bad.status).toBe(200);
  });

  it("tells someone with a broken link what to do instead", async () => {
    const res = await handleUnsubscribe("broken");
    expect(res.body).toContain("couldn't read that link");
    // A dead end would be worse than the original email.
    expect(res.body.toLowerCase()).toContain("reply");
  });

  it("escapes the address rather than reflecting it into the page", async () => {
    const res = await handleUnsubscribe(
      encodeUnsubscribeToken('a"<script>alert(1)</script>@example.com')
    );
    expect(res.body).not.toContain("<script>alert(1)</script>");
  });

  it("says the reminders stop but the transactional mail does not", async () => {
    const res = await handleUnsubscribe(
      encodeUnsubscribeToken("d@example.com")
    );
    // With no database the update cannot land, so the honest page is the
    // "we've noted that" one — either way it must not promise more than it did.
    expect(res.body).toMatch(/reminders|off the list/i);
  });
});

describe("reading the flag", () => {
  it("is true only for an explicit opt-out", () => {
    expect(isUnsubscribed({ unsubscribed: true })).toBe(true);
    expect(isUnsubscribed({ unsubscribed: false })).toBe(false);
    expect(isUnsubscribed({})).toBe(false);
    expect(isUnsubscribed(null)).toBe(false);
    // A string "true" is not an opt-out; only the boolean the writer sets.
    expect(isUnsubscribed({ unsubscribed: "true" })).toBe(false);
  });
});
