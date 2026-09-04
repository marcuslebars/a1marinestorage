import { afterEach, describe, expect, it } from "vitest";

import { __resetForTests, isConfigured, query, withTransaction } from "./index";
import { migrationFiles } from "./migrate";

/**
 * With no DATABASE_URL the app must still boot and serve. The JSONL mirror is
 * the record in that case; throwing here would turn a missing env var into a
 * site that does not start, which is strictly worse than one that logs loudly.
 */
describe("absent DATABASE_URL degrades instead of throwing", () => {
  const saved = process.env.DATABASE_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved;
    __resetForTests();
  });

  it("reports itself unconfigured", () => {
    delete process.env.DATABASE_URL;
    __resetForTests();
    expect(isConfigured()).toBe(false);
  });

  it("returns ok:false from query rather than throwing", async () => {
    delete process.env.DATABASE_URL;
    __resetForTests();
    const r = await query("select 1");
    expect(r).toMatchObject({ ok: false, rowCount: 0 });
    expect(r.rows).toEqual([]);
  });

  it("returns null from withTransaction, so callers take the fallback path", async () => {
    delete process.env.DATABASE_URL;
    __resetForTests();
    await expect(withTransaction(async () => "never")).resolves.toBeNull();
  });
});

describe("migrations", () => {
  it("are ordered by their zero-padded filename", () => {
    const files = migrationFiles();
    expect(files.length).toBeGreaterThan(0);
    expect([...files].sort()).toEqual(files);
    expect(files[0]).toMatch(/^001_/);
  });

  it("all end in .sql", () => {
    expect(migrationFiles().every(f => f.endsWith(".sql"))).toBe(true);
  });
});
