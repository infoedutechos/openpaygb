# Prisma commands used in this repository

ODELHUB Pay uses **Prisma** with **MongoDB** (`provider = "mongodb"` in `prisma/schema.prisma`). There is **no** `prisma/migrations/` directory; schema changes are applied with **`prisma db push`**, not migration deploy workflows.

This document lists **only** Prisma **CLI** invocations and **npm scripts** that wrap them. Application code importing `@prisma/client` or `PrismaClient` is outside scope.

---

## Subcommands in use

| Subcommand | Role here |
|------------|-----------|
| **`prisma generate`** | Regenerates the Prisma Client under `node_modules` after schema changes. Runs on install, builds, dev (when schema is newer than the client), and is bundled into several helper scripts. |
| **`prisma db push`** | Pushes the current `schema.prisma` to MongoDB (collections, indexes). Invoked via `npm run db:push` (see below); defaults to **`--skip-generate`** so you typically run `npm run db:generate` separately if needed. |
| **`prisma validate`** | Checks `schema.prisma` for errors. Used in **`npm run verify`** and **GitHub Actions CI** (does not require a live database). |

### Configured but invoked as a Prisma entrypoint

| Mechanism | Command you run | What Prisma executes |
|-----------|-----------------|----------------------|
| **`prisma.seed` in `package.json`** | `npx prisma db seed` | `npx tsx scripts/seed.ts` (see [Seed](#seed)). |

---

## npm scripts (`package.json`)

| Script | Prisma-related behavior |
|--------|-------------------------|
| **`postinstall`** | `prisma generate` |
| **`build`** | `prisma generate && next build` |
| **`vercel-build`** | `prisma generate && next build` |
| **`db:generate`** | `prisma generate` |
| **`db:push`** | Runs `scripts/db-push.cjs`: **`npx prisma db push`** with env loaded via `load-env.cjs`; passes **`--skip-generate`** unless you include `--skip-generate` in extra args (script merges argv). Requires `DATABASE_URL` (or the loader’s `MONGODB_URI` mapping). |
| **`schema:apply`** | `npm run db:push && npm run db:generate` — recommended one-shot after schema edits for local/shared DBs. |
| **`verify`** | Runs `scripts/verify.cjs`: ends with **`npx prisma validate`** (does **not** run `prisma generate`; see script header for Windows EPERM note). |
| **`build:full`** | `node scripts/build-full.cjs` → **`npm run db:generate`** then `build:next`. |
| **`migrate:regions`** | `npx prisma generate && npx tsx … prisma/migrate-regions.ts` |
| **`migrate:matrix-cards`** | `npx prisma generate && npx tsx … prisma/migrate-matrix-cards.ts` |
| **`migrate:matrix-labels`** | `npx prisma generate && npx tsx … prisma/update-matrix-labels.ts` |
| **`fix:team-join-duplicates`** | `npx prisma generate && npx tsx … prisma/fix-team-join-request-duplicates.ts` |

The **`migrate:*`** / **`fix:team-join-duplicates`** scripts are **data/maintenance tools** that assume the generated client matches `prisma/schema.prisma`. Older notes in `docs/FOLDER_STRUCTURE.md` mention **game-era** workflows that may require swapping in `schema.game.prisma` before running those tools.

---

## Other repo entry points that call Prisma

| Location | Command |
|----------|---------|
| **`scripts/run-next-dev.cjs`** | **`npx prisma generate`** when `prisma/schema.prisma` is newer than the client marker (or client missing). |
| **`scripts/db-push.cjs`** | **`npx prisma db push`** (+ default `--skip-generate`). |
| **`scripts/verify.cjs`** | **`npx prisma validate`** |
| **`.github/workflows/ci.yml`** | **`npx prisma validate`** |
| **`scripts/clean-install.ps1`** | Suggests `prisma db push` after build (manual). |
| **`scripts/pull-ura-app-api-game.mjs`**, **`scripts/import-ura-from-zip.cjs`** | Message-only: suggests `prisma generate` / verify (not executed by those scripts). |

---

## Seed

- **`package.json` → `"prisma": { "seed": "npx tsx scripts/seed.ts" }`**
- Run: **`npx prisma db seed`** (or `npm run seed`, which runs `npx tsx scripts/seed.ts` directly).

---

## Commands not used as first-class workflows here

- **`prisma migrate dev` / `prisma migrate deploy`** — no committed migration history; use **`db push`** instead.
- **`prisma studio`** — not wired in `package.json`; you may run **`npx prisma studio`** locally if desired.
- **`prisma format`**, **`prisma pull`**, etc. — not referenced by repo automation; optional developer use.

---

## Typical local sequence after editing `schema.prisma`

1. **`npm run db:push`** — sync MongoDB (with `--skip-generate` inside the wrapper; intentional).
2. **`npm run db:generate`** — regenerate client (especially if `db push` skipped generate, or to recover from a failed rename on Windows).
3. **`npm run verify`** — lint, tests, `tsc`, **`prisma validate`**.

Or in one step: **`npm run schema:apply`**.

---

## See also

- `docs/FOLDER_STRUCTURE.md` — overview of `verify`, `db:push`, `db:generate`, `build`.
- `docs/PLATFORM_FLOWS.md` — mentions `npx prisma generate` and `npx prisma db push`.
- `prisma/schema.prisma` — single active schema for Pay + merged game models (MongoDB).
