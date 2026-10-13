// Migration 002 (empirevu_lead_id -> everdoer_lead_id) against a REAL Postgres.
//
// Skipped unless TEST_DATABASE_URL points at a throwaway database: the test
// drops and recreates the `public` schema. Never point it at anything real.
//
//   TEST_DATABASE_URL='postgres://postgres@127.0.0.1:55432/a1ms_test?sslmode=disable' \
//     corepack pnpm exec vitest run server/db/everdoer-lead-id.pg.test.ts
//
// Covers both deploy orders: new code before the migration has applied, and
// old code (writing only empirevu_lead_id) after it has.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetForTests, closePool } from "./index";
import { runMigrations } from "./migrate";
import { attachEverdoerResult, getEverdoerLeadId, insertQuote } from "./quotes";

const URL = process.env.TEST_DATABASE_URL;
const here = dirname(fileURLToPath(import.meta.url));
const sql = (rel: string) => readFileSync(join(here, rel), "utf8");
const MIGRATION = sql("migrations/002_everdoer_lead_id.sql");
const ROLLBACK = sql("rollbacks/002_everdoer_lead_id.down.sql");

describe.skipIf(!URL)("quotes.everdoer_lead_id (real Postgres)", () => {
  const admin = new pg.Client({ connectionString: URL });
  let connected = false;

  async function columns(): Promise<string[]> {
    const r = await admin.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'quotes'
          and column_name like '%lead_id' order by column_name`
    );
    return r.rows.map(x => x.column_name);
  }

  async function applied(): Promise<string[]> {
    const r = await admin.query<{ filename: string }>(
      "select filename from schema_migrations order by filename"
    );
    return r.rows.map(x => x.filename);
  }

  /** Apply 001 only, recorded the way the migrator records it. */
  async function only001() {
    await admin.query(sql("migrations/001_init.sql"));
    await admin.query(`create table if not exists schema_migrations (
      filename text primary key, applied_at timestamptz not null default now())`);
    await admin.query(
      "insert into schema_migrations (filename) values ('001_init.sql')"
    );
  }

  const row = (id: string, leadId?: string) => ({
    id,
    receivedAt: "2026-10-13T12:00:00.000Z",
    source: "calculator" as const,
    contact: { email: "a@b.com" },
    everdoerLeadId: leadId,
  });

  beforeEach(async () => {
    if (!connected) {
      await admin.connect();
      connected = true;
    }
    await admin.query("drop schema public cascade; create schema public;");
    await closePool();
    __resetForTests();
    process.env.DATABASE_URL = URL;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(async () => {
    await closePool();
    delete process.env.DATABASE_URL;
    if (connected) await admin.end();
  });

  it("new code BEFORE the migration: writes and reads the old column", async () => {
    await only001();
    expect(
      await insertQuote(row("00000000-0000-4000-8000-000000000001", "lead_1"))
    ).toBe(true);
    await attachEverdoerResult("00000000-0000-4000-8000-000000000001", {
      leadId: "lead_1b",
    });
    expect(
      await getEverdoerLeadId("00000000-0000-4000-8000-000000000001")
    ).toBe("lead_1b");
    const r = await admin.query("select empirevu_lead_id from quotes");
    expect(r.rows[0].empirevu_lead_id).toBe("lead_1b");
  });

  it("the migrator applies 002, backfilling existing rows", async () => {
    await only001();
    await admin.query(
      `insert into quotes (id, received_at, source, contact, empirevu_lead_id)
       values ('00000000-0000-4000-8000-000000000005', now(), 'calculator', '{}', 'lead_old')`
    );
    const { applied: ran } = await runMigrations();
    expect(ran).toEqual(["002_everdoer_lead_id.sql"]);
    expect(await columns()).toEqual(["empirevu_lead_id", "everdoer_lead_id"]);
    const r = await admin.query(
      "select everdoer_lead_id from quotes where id = '00000000-0000-4000-8000-000000000005'"
    );
    expect(r.rows[0].everdoer_lead_id).toBe("lead_old");
    expect(
      await getEverdoerLeadId("00000000-0000-4000-8000-000000000005")
    ).toBe("lead_old");
  });

  it("new code AFTER the migration writes both columns", async () => {
    await runMigrations();
    expect(
      await insertQuote(row("00000000-0000-4000-8000-000000000002", "lead_2"))
    ).toBe(true);
    await attachEverdoerResult("00000000-0000-4000-8000-000000000002", {
      leadId: "lead_2b",
      depositUrl: "https://x/q",
    });
    const r = await admin.query(
      "select everdoer_lead_id, empirevu_lead_id, status from quotes where id = '00000000-0000-4000-8000-000000000002'"
    );
    expect(r.rows[0]).toEqual({
      everdoer_lead_id: "lead_2b",
      empirevu_lead_id: "lead_2b",
      status: "quoted",
    });
  });

  it("OLD code after the migration (writes empirevu_lead_id only) is still read", async () => {
    await runMigrations();
    await admin.query(
      `insert into quotes (id, received_at, source, contact, empirevu_lead_id)
       values ('00000000-0000-4000-8000-000000000006', now(), 'calculator', '{}', 'lead_legacy')`
    );
    expect(
      await getEverdoerLeadId("00000000-0000-4000-8000-000000000006")
    ).toBe("lead_legacy");
  });

  it("migration and rollback are each safe to run twice, and re-apply cleanly", async () => {
    await runMigrations();
    await insertQuote(row("00000000-0000-4000-8000-000000000003", "lead_3"));
    // A row only the NEW column knows about must survive the rollback.
    await admin.query(
      "update quotes set empirevu_lead_id = null where id = '00000000-0000-4000-8000-000000000003'"
    );

    await admin.query(MIGRATION);
    await admin.query(MIGRATION);
    expect(await columns()).toEqual(["empirevu_lead_id", "everdoer_lead_id"]);

    await admin.query(ROLLBACK);
    await admin.query(ROLLBACK);
    expect(await columns()).toEqual(["empirevu_lead_id"]);
    expect(await applied()).toEqual(["001_init.sql"]);
    const r = await admin.query(
      "select empirevu_lead_id from quotes where id = '00000000-0000-4000-8000-000000000003'"
    );
    expect(r.rows[0].empirevu_lead_id).toBe("lead_3");

    // Rolled back with the rebranded code still deployed: still writes.
    expect(
      await insertQuote(row("00000000-0000-4000-8000-000000000004", "lead_4"))
    ).toBe(true);
    expect(
      await getEverdoerLeadId("00000000-0000-4000-8000-000000000004")
    ).toBe("lead_4");

    // And the next deploy's migrator puts it back.
    expect((await runMigrations()).applied).toEqual([
      "002_everdoer_lead_id.sql",
    ]);
    expect(
      await getEverdoerLeadId("00000000-0000-4000-8000-000000000003")
    ).toBe("lead_3");
    expect(
      await getEverdoerLeadId("00000000-0000-4000-8000-000000000004")
    ).toBe("lead_4");
    expect((await runMigrations()).applied).toEqual([]);
  });
});
