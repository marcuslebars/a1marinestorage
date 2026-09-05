# A1 Marine Storage (a1marinestorage.ca)

Vite + React (wouter) SPA with an Express server. Seasonal boat storage, shrink
wrapping, and winterization — with a bundles-first quote calculator and lead
capture, both on the shared pricing engine.

## Develop

```bash
corepack pnpm install
corepack pnpm dev        # Vite dev server (http://localhost:3000) — /api/quote + /api/contact served by dev middleware
corepack pnpm exec vitest run   # engine-mapping + handler tests
corepack pnpm run check         # tsc --noEmit
corepack pnpm build             # client (dist/public) + server (dist/index.js)
corepack pnpm start             # run the built server
```

### Server env vars

| Var                                                        | Purpose                                                                                                            | Default                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `LEAD_WEBHOOK_URL`                                         | Base URL of the shared A1 lead pipeline                                                                            | `https://leads.a1marinecare.ca`                   |
| `LEAD_WEBHOOK_SECRET` / `CRM_WEBHOOK_SECRET`               | Sent as `x-webhook-secret` on the forward                                                                          | _(unset — omitted)_                               |
| `QUOTE_LOG_DIR`                                            | Durable submission log directory                                                                                   | `./.quote-submissions`                            |
| `STORAGE_WEBHOOK_DISABLED`                                 | `1` to skip the outbound forward (durable log still written)                                                       | _(unset)_                                         |
| `DATABASE_URL`                                             | Postgres. **Unset = the JSONL log is the only record, and it does not survive a redeploy.** Required in production | _(unset — Postgres disabled)_                     |
| `PUBLIC_BASE_URL`                                          | Public origin for links in job-sent emails (no request to read a host from)                                        | `https://a1marinestorage.ca`                      |
| `RESEND_API_KEY`                                           | Email provider key. Unset = every email is skipped and logged                                                      | _(unset — email off)_                             |
| `MAIL_FROM`                                                | Envelope From for customer email                                                                                   | `A1 Marine Storage <bookings@a1marinestorage.ca>` |
| `MAIL_REPLY_TO`                                            | Where a customer's reply goes                                                                                      | `contact@a1marinestorage.ca`                      |
| `MAIL_BCC_OWNER`                                           | Blind copy of every customer email to the yard                                                                     | _(unset)_                                         |
| `OWNER_ALERT_EMAIL`                                        | Internal per-lead alert ("needs a call" vs auto-quoted)                                                            | _(falls back to `MAIL_BCC_OWNER`)_                |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | SMS. All three or none; Canadian numbers only                                                                      | _(unset — SMS off)_                               |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET`                  | Cloudflare Turnstile. Unset = verification skipped entirely                                                        | _(unset — off)_                                   |

## Shared pricing engine (`@a1/pricing-engine`)

All storage pricing comes from the shared engine, pinned in `package.json` to a Git tag:

```json
"@a1/pricing-engine": "git+https://github.com/marcuslebars/a1-pricing-engine.git#v1.0.0"
```

Deploys install this exact tag — reproducible, nothing else to set up. **Consistency across the two A1 sites comes from the pinned version, not from copied files.**

### Local engine development (sibling-clone layout)

To edit prices/logic in the engine and see them here _before_ cutting a tag, clone the repos so the engine sits **two directories above this app's `package.json`** — i.e. so `../../a1-pricing-engine` resolves to it:

```
<workspace>/
├── a1-pricing-engine/                 # git clone https://github.com/marcuslebars/a1-pricing-engine
├── a1marinestorage-main/
│   └── a1marinestorage-main/          # ← this app (package.json lives here)
└── a1marinecare-main (1)/
    └── a1marinecare-main/             # the care app (same engine)
```

Then:

1. Point the dependency at the local clone: `"@a1/pricing-engine": "file:../../a1-pricing-engine"`
2. `corepack pnpm install`
3. After editing the engine's `src/`, run `npm run build` inside `a1-pricing-engine` (its `dist/` is committed and is what gets consumed).
4. To release: commit + push + tag the engine, then switch this dependency back to the pinned `git+https://…#<tag>` form and `pnpm install`.

Do **not** commit the `file:` form — it only works with the sibling layout above. (If your checkout isn't double-nested like the download, adjust the `../` count so it points at the engine clone.)

## Scripts

| Command                                                      | What it does                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:migrate`                                            | Applies `server/db/migrations/*.sql` in filename order, once each, tracked in `schema_migrations`. Each file runs in a transaction with its own bookkeeping insert, so a half-applied migration is never recorded as done. Safe to run on every deploy; a no-op with no `DATABASE_URL`.        |
| `pnpm jobs:run`                                              | Runs every `server/jobs/*.job.ts` once and exits — the entry point for the Railway cron service (every 15 minutes). Jobs are idempotent through the `notifications` unique key, so overlapping runs are safe. One job failing does not stop the others; the process exits non-zero if any did. |
| `pnpm notify:smoke -- --to you@example.com [--sms +1705...]` | Sends a real email and/or SMS through the configured providers. **Not** part of `vitest`: it costs money and needs live credentials, which is exactly why it catches a wrong key or an unverified domain that mocked tests cannot.                                                             |
| `pnpm check:geocoder`                                        | Hits the live geocoder with real town names plus a nonsense control. See `scripts/check-geocoder.mjs`.                                                                                                                                                                                         |

## Durability

A submission is recorded in **two** places: Postgres (`quotes`) and a JSONL file
under `QUOTE_LOG_DIR`. The handler reports success if **either** accepted it.

The JSONL mirror exists because Railway's filesystem is ephemeral — it is
recoverable evidence between deploys, not the system of record. Postgres is the
record. With no `DATABASE_URL` the site still runs and still takes bookings, but
every lead is one redeploy from gone, so production must set it.
