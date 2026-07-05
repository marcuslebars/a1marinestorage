import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

process.env.STORAGE_WEBHOOK_DISABLED = "1";

const TMP = path.join(os.tmpdir(), "a1-storage-contact-test");
const load = () => import("./contact-handler");

const valid = {
  name: "John Smith",
  email: "john@example.com",
  phone: "705-555-1234",
  boatMakeModel: "2018 Chaparral 23",
  boatLength: "24",
  serviceInterest: "storage-shrinkwrap",
  message: "Looking for winter storage and shrink wrapping.",
};

describe("storage contact submission handler", () => {
  it("writes a durable a1marinestorage-contact record and returns 200", async () => {
    if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
    process.env.QUOTE_LOG_DIR = TMP;
    const { handleContactSubmission } = await load();
    const res = await handleContactSubmission(valid);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const files = fs.readdirSync(TMP).filter((f) => f.startsWith("contacts-"));
    expect(files.length).toBeGreaterThan(0);
    const content = files.map((f) => fs.readFileSync(path.join(TMP, f), "utf-8")).join("");
    expect(content).toContain("a1marinestorage-contact");
    expect(content).toContain("john@example.com");
  });

  it("rejects an invalid submission with 400", async () => {
    process.env.QUOTE_LOG_DIR = TMP;
    const { handleContactSubmission } = await load();
    expect((await handleContactSubmission({ name: "", email: "nope", phone: "1" })).status).toBe(400);
    expect((await handleContactSubmission({})).status).toBe(400);
  });

  it("returns 500 with no fake success when the durable log cannot be written", async () => {
    const blocker = path.join(os.tmpdir(), "a1-storage-contact-blocker");
    fs.writeFileSync(blocker, "x");
    process.env.QUOTE_LOG_DIR = path.join(blocker, "nested");
    const { handleContactSubmission } = await load();
    const res = await handleContactSubmission(valid);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
  });
});
