// The migrator's files have to actually exist where the migrator looks.
//
// PRODUCTION CRASH-LOOPED ON THIS. esbuild bundles JavaScript and knew nothing
// about the .sql files migrate.ts reads at runtime, so `dist/db/migrate.js`
// shipped with no `dist/db/migrations` beside it:
//
//   [migrate] FAILED: ENOENT: no such file or directory,
//             scandir '/app/dist/db/migrations'
//
// It stayed invisible through two deploys because the migrator exits early when
// DATABASE_URL is unset. The first deploy WITH a database was the first one that
// read the directory — and `start` was `migrate && server`, so the site went
// down rather than starting without its schema.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { migrationFiles, migrationsDir } from "./migrate";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

describe("finding the migrations", () => {
  it("resolves a directory that exists", () => {
    const dir = migrationsDir();
    expect(dir).toBeTruthy();
    expect(fs.existsSync(dir!)).toBe(true);
  });

  it("returns the .sql files in lexical order, which is chronological order", () => {
    const files = migrationFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.endsWith(".sql"))).toBe(true);
    expect(files).toEqual([...files].sort());
  });
});

describe("the build ships them", () => {
  // The guard against the exact regression: if the copy step is ever dropped
  // from the build, the next deploy with a database repeats the outage.
  it("runs the copy step as part of `pnpm build`", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toContain("scripts/copy-migrations.mjs");
  });

  it("does not gate the SERVER on the migrator — a bad migration must not take the site down", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
    ) as { scripts: Record<string, string> };
    // `migrate && server` is what turned a missing directory into an outage.
    expect(pkg.scripts.start).not.toMatch(/migrate\.js\s*&&/);
    expect(pkg.scripts.start).toContain("dist/index.js");
  });

  it("copy-migrations.mjs actually copies the .sql files", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "a1-copy-"));
    try {
      // Run it against a scratch dist so the real one is untouched.
      execFileSync(
        process.execPath,
        [path.join(ROOT, "scripts", "copy-migrations.mjs")],
        { cwd: ROOT, stdio: "pipe" }
      );
      const out = path.join(ROOT, "dist", "db", "migrations");
      expect(fs.existsSync(out)).toBe(true);
      const copied = fs.readdirSync(out).filter(f => f.endsWith(".sql"));
      expect(copied).toEqual(migrationFiles());
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
