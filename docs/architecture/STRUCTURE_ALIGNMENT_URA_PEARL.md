# ODELHUB Pay ↔ [ura-pearl-data-center](https://github.com/urapearlug-sys/ura-pearl-data-center)

## Play Hub quick sync (recommended)

The **Play Hub** (`/?hub=play`, `/clicker`, game APIs) tracks **[urapearlug-sys/ura-pearl-data-center](https://github.com/urapearlug-sys/ura-pearl-data-center)**. Pull the clicker route tree + game `app/api/**` (skipping Pay-owned segments) + upstream runbooks:

```bash
npm run sync:play-hub
```

Use **`GITHUB_TOKEN`** (classic PAT, public repo) if GitHub rate-limits the Contents API. Full upstream admin/API port: **`npm run sync:ura-all`** (also runs URA admin trees; use when you intend to refresh those files).

**Pay-protected API segments** are never overwritten by `sync:ura-game-apis`: includes `public` (checkout/Mbiyo), `student`, `master`, plus `admin`, `auth`, `collect`, `cron`, `fx`, `health`, `manifest`, `payments`, `programmes`, `receipts`, `students`, `webhooks`.

This document maps **this repository** to the layout used by **URA Pearl Data Center** (upstream: `urapearlug-sys/ura-pearl-data-center`, default branch `main`).

## Top-level layout (aligned)

Both repos use a **single Next.js App Router** app with **no `src/` app root**: routes and route handlers live under root **`app/`**, shared server logic under **`lib/`**, Prisma under **`prisma/`**, static assets under **`public/`**, tooling under **`scripts/`**, shared TS under **`types/`**, and optional **`middleware.ts`** at the repo root.

| Area | URA Pearl Data Center | ODELHUB Pay |
|------|----------------------|-------------|
| **App Router** | `app/` (pages, layouts, `app/api/**/route.ts`) | Same |
| **Shared React** | `components/` (widgets, shell pieces) | Same folder name; **Pay-specific** UI lives in **`components/pay/`** so it stays next to URA-style `components/` without pulling merged game bundles into `tsc` |
| **Server / domain** | `lib/` + heavy use of `utils/` | **`lib/`** = Pay (Prisma, auth, money, Telegram, MoMo, TON). **`utils/`** = merged / game-era helpers (kept for parity with upstream trees; not part of the Pay `tsc` program) |
| **Contexts / data / icons / images** | Present in upstream tree | Same names exist where merged content kept them |
| **Prisma** | `prisma/schema.prisma` | **`schema.prisma`** = ODELHUB Pay Mongo models. **`schema.game.prisma`** = archived clicker/game schema (not loaded by `prisma generate`) |
| **Config** | `.eslintrc.json`, `.gitignore`, `.vercelignore`, `.vscode/` | Same categories present |
| **Docs** | Many deployment `.md` files at repo root | **`docs/`** subfolder for product + structure docs (preference; does not change runtime layout) |

## Single config surface (no `*2` duplicates)

One canonical file each: **`package.json`** + **`package-lock.json`**, **`tsconfig.json`**, **`vercel.json`**. Legacy **`package2.json`**, **`package-lock2.json`**, **`tsconfig2.json`**, **`vercel2.json`** were removed; anything useful from them was merged (URA-style **`vercel-build`**, **`deploy`**, **`migrate:*`**, **`prisma.seed`**, and dependencies used by merged **`components/`** / **`utils/`** such as Telegram Mini App SDKs, **`zustand`**, **`react-hot-toast`**, **`ua-parser-js`**, **`@tma.js/init-data-node`**).

**Note:** Upstream [ura-pearl-data-center](https://github.com/urapearlug-sys/ura-pearl-data-center) is a full **Next 14 + Prisma 5** game + large admin area. ODELHUB Pay stays on **Next 15 + Prisma 6** for the tuition product; merged folders on disk mirror much of that UI, but **not every admin route** from URA is wired into `app/` until you intentionally port them.

## TypeScript paths

Imports use **`@/*` → repo root** (not `src/`):

```json
"baseUrl": ".",
"paths": { "@/*": ["./*"] },
"typeRoots": ["./node_modules/@types", "./types"]
```

Vitest resolves **`@`** to the project root in `vitest.config.ts`.

## `tsconfig.json` vs upstream

URA Pearl typechecks the whole game + admin surface. This repo **narrows the TypeScript program** to the Pay app plus **`components/pay/**`** and **`scripts/**/*.ts`**, so `npm run verify` stays green while merged **`components/`** (game UI) and **`utils/`** remain on disk for optional reuse.

Next.js and ESLint still see those folders for build/lint where applicable.

## URA-only conventions you may mirror later

- **Colocated admin components**: upstream places some TSX under **`app/admin/`** (e.g. feature-specific components next to `page.tsx`). ODELHUB admin is smaller; you can colocate the same way when adding screens.
- **Root markdown**: upstream keeps many operational `.md` files at repo root; here they are mostly under **`docs/`** unless you choose to duplicate that style.

## One App Router root only

Do **not** add **`src/app`** while root **`app/`** exists — Next.js will treat **`app/`** as the App Router root.

## Sync from upstream GitHub (structure + runbooks + clicker)

These scripts download files from **[urapearlug-sys/ura-pearl-data-center](https://github.com/urapearlug-sys/ura-pearl-data-center)** (`main`) into this repo:

| npm script | Writes |
|------------|--------|
| **`npm run sync:ura-admin`** | `app/admin/**` except Pay-owned login, students, payments, dashboard `page.tsx` |
| **`npm run sync:ura-api-admin`** | `app/api/admin/**` except `summary` |
| **`npm run sync:ura-clicker`** | **`app/clicker/**`** — upstream Telegram mini-app shell (`/clicker`, terms, privacy) |
| **`npm run sync:ura-docs`** | **`docs/upstream-ura-pearl/**`** — root `*.md` + `DEPLOYMENT_VERSION.txt` from upstream |
| **`npm run sync:ura-game-apis`** | **`app/api/**`** game/public routes from upstream (wallet, user, teams, upgrade, sync, …) — **skips** Pay segments: `admin`, `auth`, `collect`, `cron`, `fx`, `health`, `manifest`, `master`, `payments`, `programmes`, `public`, `receipts`, `student`, `students`, `webhooks` |
| **`npm run sync:ura-game-docs`** | **`docs/upstream-ura-game/**`** — upstream repo **`docs/`** (NFT, teams, game overview, …) |
| **`npm run import:ura-from-zip`** | **Offline:** copies game `app/api/**` + upstream `docs/*.md` from a local **`ura-pearl-data-center-main.zip`** (default: `%USERPROFILE%\\Desktop\\urapearlug@gmail.com\\…zip`; override with `URPEARL_ZIP` or argv). Use when **`sync:ura-game-apis`** hits GitHub rate limits. |
| **`npm run sync:play-hub`** | **Play Hub bundle:** `sync:ura-clicker` + `sync:ura-game-apis` + `sync:ura-docs` + `sync:ura-game-docs` (no URA admin trees) |
| **`npm run sync:ura-all`** | Runs admin, api-admin, game-apis, clicker, root-docs, and game-docs in order |

### Game sync — command vs role (quick copy)

| Command | Role |
|---------|------|
| **`npm run sync:ura-game-apis`** | GitHub pull for game `app/api/**` (skips Pay segments). Retries on 403/429 with long waits; **`GITHUB_TOKEN`** strongly recommended. |
| **`npm run import:ura-from-zip`** | Offline: same game APIs + zip `docs/` → **`docs/upstream-ura-game/`**. Default zip: `%USERPROFILE%\Desktop\urapearlug@gmail.com\ura-pearl-data-center-main.zip`; override with **`URPEARL_ZIP`** or `node scripts/import-ura-game-from-zip.cjs "C:\path\to.zip"`. |
| **`npm run sync:ura-game-docs`** | Pull upstream `docs/` from GitHub into **`docs/upstream-ura-game/`** (when API is not rate-limited). |
| **`npm run sync:play-hub`** | **Recommended for Play Hub:** clicker + game APIs + pearl runbooks + game docs (skips tuition admin pull). |
| **`npm run sync:ura-all`** | Runs **`sync:ura-admin`**, **`sync:ura-api-admin`**, **`sync:ura-game-apis`**, **`sync:ura-clicker`**, **`sync:ura-docs`**, **`sync:ura-game-docs`** in order. |

Set **`GITHUB_TOKEN`** (classic PAT, no scopes needed for public repo) if GitHub returns **403** mid-sync (rate limit).

Pay-first routes **`/pay`**, **`/receipt/[paymentId]`**, and Pay admin (**login / students / payments / dashboard**) stay in this repo and are skipped or preserved by the admin/API scripts.

## Re-running layout migration

See **`docs/architecture/FOLDER_STRUCTURE.md`** and **`npm run migrate:ura-layout`** (or robocopy flow in **FOLDER_STRUCTURE.md**) if an old clone still has `src/app` / `src/lib`.

## Repo scan snapshot (ODELHUB Pay)

**First-party layout:** `app/`, `components/` (incl. **`components/pay/`**), `contexts/`, `data/`, `docs/`, `icons/`, `images/`, `lib/`, `prisma/`, `public/`, `scripts/`, `types/`, `utils/`, `.github/`, `.husky/`, `.vscode/`, root configs (`package.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `middleware.ts`, `vitest.config.ts`, `.eslintrc.json`, `.vercelignore`, etc.).

**Merged / legacy trees:** large **`components/`** (non-`pay`) and **`utils/`** mirror patterns from the Telegram game / URA admin ecosystem; they are not required to run the Pay tuition flows if you only ship `app/` + `lib/` + `components/pay/`.

Regenerate a pruned ASCII tree anytime: **`npm run docs:tree:write`** → `docs/architecture/FOLDER_TREE_SNAPSHOT.txt`.
