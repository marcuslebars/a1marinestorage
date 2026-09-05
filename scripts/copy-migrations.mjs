// Copy server/db/migrations/*.sql into dist/db/migrations.
//
// esbuild bundles JavaScript. It does not know that migrate.ts reads a
// directory of .sql files at runtime, so the build produced dist/db/migrate.js
// with nothing beside it and production crashed on the first deploy that had a
// DATABASE_URL set:
//
//   [migrate] FAILED: ENOENT: no such file or directory,
//             scandir '/app/dist/db/migrations'
//
// Node rather than `cp`: this runs on Windows dev machines too, where `cp -r`
// is not a command.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "server", "db", "migrations");
const to = join(root, "dist", "db", "migrations");

const files = readdirSync(from).filter(f => f.endsWith(".sql"));

// An empty copy would be silent and would look exactly like a healthy build
// right up until the deploy, which is the failure this script exists to end.
if (files.length === 0) {
  console.error(
    `[build] no .sql files in ${from} — refusing to ship a migrator with nothing to run`
  );
  process.exit(1);
}

mkdirSync(to, { recursive: true });
for (const f of files) copyFileSync(join(from, f), join(to, f));
console.log(
  `[build] copied ${files.length} migration(s) to dist/db/migrations`
);
