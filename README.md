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

| Var | Purpose | Default |
|---|---|---|
| `LEAD_WEBHOOK_URL` | Base URL of the shared A1 lead pipeline | `https://leads.a1marinecare.ca` |
| `LEAD_WEBHOOK_SECRET` / `CRM_WEBHOOK_SECRET` | Sent as `x-webhook-secret` on the forward | *(unset — omitted)* |
| `QUOTE_LOG_DIR` | Durable submission log directory | `./.quote-submissions` |
| `STORAGE_WEBHOOK_DISABLED` | `1` to skip the outbound forward (durable log still written) | *(unset)* |

## Shared pricing engine (`@a1/pricing-engine`)

All storage pricing comes from the shared engine, pinned in `package.json` to a Git tag:

```json
"@a1/pricing-engine": "git+https://github.com/marcuslebars/a1-pricing-engine.git#v1.0.0"
```

Deploys install this exact tag — reproducible, nothing else to set up. **Consistency across the two A1 sites comes from the pinned version, not from copied files.**

### Local engine development (sibling-clone layout)

To edit prices/logic in the engine and see them here *before* cutting a tag, clone the repos so the engine sits **two directories above this app's `package.json`** — i.e. so `../../a1-pricing-engine` resolves to it:

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
