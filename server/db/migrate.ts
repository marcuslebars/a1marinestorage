// Apply server/db/migrations/*.sql in filename order, once each.
//
// Plain SQL, no ORM, no rollback machinery. Migrations here are additive by
// convention, so "undo" means writing the next migration — which is also what
// makes it safe to run on every deploy.
//
// Each file runs inside a TRANSACTION together with its schema_migrations
// insert, so a half-applied migration cannot be recorded as done. Postgres
// supports transactional DDL; that is what makes this safe without a lock table.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { closePool, isConfigured, query, withTransaction } from "./index";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Where the .sql files are, wherever this is running from.
 *
 * Two real locations, not defensive padding:
 *   dist/db/migrations   — production, put there by scripts/copy-migrations.mjs
 *   server/db/migrations — dev under tsx, where `here` IS the source directory
 *
 * The fallback to the repo path exists because the first production deploy with
 * a DATABASE_URL crash-looped on a missing dist/db/migrations: esbuild bundles
 * JS and silently leaves .sql behind. The build now copies them, and this makes
 * a future build-step regression degrade instead of taking the site down.
 */
export function migrationsDir(): string | null {
  for (const dir of [
    join(here, "migrations"),
    join(process.cwd(), "server", "db", "migrations"),
  ]) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

export function migrationFiles(): string[] {
  const dir = migrationsDir();
  if (!dir) return [];
  return (
    readdirSync(dir)
      .filter(f => f.endsWith(".sql"))
      // Lexical order over zero-padded prefixes is chronological order.
      .sort()
  );
}

export async function runMigrations(): Promise<{
  applied: string[];
  skipped: string[];
}> {
  if (!isConfigured()) {
    console.warn("[migrate] DATABASE_URL is not set — nothing to do.");
    return { applied: [], skipped: [] };
  }

  await query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const done = new Set(
    (
      await query<{ filename: string }>(
        "select filename from schema_migrations"
      )
    ).rows.map(r => r.filename)
  );

  const dir = migrationsDir();
  if (!dir) {
    // Loud, and NOT fatal. The site served this business for years with no
    // database at all; a build that mislaid the .sql files must not be the
    // reason nobody can reach the calculator.
    console.error(
      "[migrate] no migrations directory found — the schema was NOT applied. " +
        "Leads will fall back to the JSONL mirror. Check that the build ran " +
        "scripts/copy-migrations.mjs."
    );
    return { applied: [], skipped: [] };
  }

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of migrationFiles()) {
    if (done.has(file)) {
      skipped.push(file);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    // The insert rides in the SAME transaction as the DDL: if the migration
    // fails halfway, nothing is recorded and the next run retries it cleanly.
    await withTransaction(async client => {
      await client.query(sql);
      await client.query(
        "insert into schema_migrations (filename) values ($1)",
        [file]
      );
    });
    applied.push(file);
    console.log(`[migrate] applied ${file}`);
  }

  if (applied.length === 0)
    console.log(`[migrate] up to date (${skipped.length} already applied)`);
  return { applied, skipped };
}

// Run directly: `pnpm db:migrate` in dev (tsx), `node dist/migrate.js` on deploy.
// Both extensions match, because the deploy runs the BUNDLED file and a .ts-only
// guard would silently skip migrations in production — the one place they matter.
if (process.argv[1] && /migrate\.(ts|js)$/.test(process.argv[1])) {
  runMigrations()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch(async err => {
      console.error(
        "[migrate] FAILED:",
        err instanceof Error ? err.message : err
      );
      await closePool().catch(() => {});
      process.exit(1);
    });
}
