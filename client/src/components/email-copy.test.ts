// The label and the send have to agree.
//
// This field promised "Email it to me too" for months while nothing on the
// server sent anything — the address was filed as a lead and the customer
// waited for an email that was never coming. P1 made the copy honest; P2 built
// the send; a verified production send is what earned the word "email" back.
//
// A test rather than a comment, because the failure mode is silent: someone
// removes the pdf_copy send and the label keeps promising an email, and nobody
// notices until a customer asks where it went.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("the download card's email field", () => {
  const card = read("client/src/components/DownloadQuoteButton.tsx");
  const handler = read("server/partial-lead-handler.ts");
  const route = read("server/index.ts");

  const promisesAnEmail = /placeholder="Email me a copy too/.test(card);

  it("only promises an email if something actually sends one", () => {
    if (!promisesAnEmail) return; // Copy is the cautious wording — nothing to prove.
    expect(handler).toContain('notify(id, "pdf_copy", "email"');
  });

  it("only promises an email if the PDF and link reach the sender", () => {
    if (!promisesAnEmail) return;
    // The send is conditional on all three arriving; the route must pass them
    // or the email silently never goes.
    expect(route).toMatch(/pdf:\s*result\.pdf/);
    expect(route).toMatch(/resumeUrl:\s*result\.resumeUrl/);
  });

  it("attaches the same bytes the customer downloaded", () => {
    if (!promisesAnEmail) return;
    // Re-rendering would risk an attachment that disagrees with the download.
    expect(handler).toContain("content: input.pdf");
  });
});
