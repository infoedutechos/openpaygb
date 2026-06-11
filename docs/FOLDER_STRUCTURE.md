# ODEL HUB Pay — full folder & project structure

Single Next.js 15 **App Router** application: UI + Route Handlers; **MongoDB** + **Prisma**; deployable on **Vercel**.

---

## 1. Full repository tree (markdown)

Generated from the filesystem with `npm run docs:tree` (see [Regenerate](#5-regenerate-the-tree)). **URA Pearl** mapping, **`tsconfig` include** rules (Pay vs merged trees), and a repo scan: **[STRUCTURE_ALIGNMENT_URA_PEARL.md](./STRUCTURE_ALIGNMENT_URA_PEARL.md)**. **Short layout hub:** **[STRUCTURE.md](./STRUCTURE.md)**.

**Omitted from the diagram** (not tracked or not useful in docs): `node_modules/`, `.next/`, `.git/`, `.husky/_/`, `.env`, `.env.local`, `*.tsbuildinfo`, `npm-install-log*.txt`, `tree-out.txt`.

Top-level layout matches **[ura-pearl-data-center](https://github.com/urapearlug-sys/ura-pearl-data-center)**: **`app/`**, **`components/`** (Pay UI in **`components/pay/`**; other dirs are merged URA/game UI), **`lib/`**, **`utils/`**, **`types/`**, **`contexts/`**, **`data/`**, **`icons/`**, **`images/`**, **`middleware.ts`**, **`prisma/`** (`schema.prisma` = Pay, **`schema.game.prisma`** = archived game schema), **`public/`**, **`scripts/`**.

**Checked-in pruned tree (UTF-8):** **[FOLDER_TREE_SNAPSHOT.txt](./FOLDER_TREE_SNAPSHOT.txt)** — `components/`, `utils/`, and `images/` are stubbed to one line each; full listing: `npm run docs:tree`.

**Regenerate snapshot:** `npm run docs:tree:write` (writes `docs/FOLDER_TREE_SNAPSHOT.txt`).

---

## 2. Route map (HTTP + pages)

| Area | Path / pattern |
|------|----------------|
| Public home | `/` |
| Pay | `/pay`, `/pay/[orgSlug]` (tenant-specific checkout) |
| Receipt | `/receipt/[paymentId]` |
| URA clicker (synced from upstream) | `/clicker`, `/clicker/terms`, `/clicker/privacy` — populate with **`npm run sync:ura-clicker`** |
| Admin | `/admin`, `/admin/login`, `/admin/students`, `/admin/students/[id]`, `/admin/payments` |
| API | `/api/*` — Pay routes plus merged **URA game** routes (`/api/user`, `/api/sync`, `/api/teams`, …). Public in-game **shop** lives under `/api/shop/*`; **admin** shop remains `/api/admin/shop/*`. |

---

## 3. Layering (architecture)

| Layer | Location | Role |
|--------|----------|------|
| **Data** | `prisma/schema.prisma` | Organizations, students, payments, FX, admins, webhooks dedupe |
| **HTTP API** | `app/api/**/route.ts` | JSON APIs, webhooks, auth cookies |
| **UI** | `app/**` (non-`api`) | RSC + client pages, layouts |
| **Shared logic** | `lib/**` | Prisma client, auth/JWT, money, tenant scope, Telegram, MoMo, TON |
| **Shared UI** | `components/pay/**` + other `components/**` | Pay shell under **`components/pay/`** (URA-style root `components/` name); merged game/admin widgets elsewhere in `components/` |
| **Ops** | `scripts/**` | Seed, DB push, verify, dev runner, Telegram webhook script |
| **CI** | `.github/workflows/ci.yml` | Pipeline |
| **Hooks** | `.husky/pre-commit` | Runs `npm run verify` |

---

## 4. npm scripts (reference)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run verify` | Lint, unit tests, `tsc`, `prisma validate` |
| `npm run docs:tree` | Print full folder tree to stdout |
| `npm run docs:tree:prune` | Print tree with large dirs stubbed (`components/`, `utils/`, `images/`) |
| `npm run docs:tree:write` | Write pruned tree to `docs/FOLDER_TREE_SNAPSHOT.txt` |
| `npm run migrate:ura-layout` | One-time: `src/app` → `app/`, `src/lib` → `lib/` (use robocopy on Windows if EPERM) |
| `npm run db:push` | `prisma db push` (loads `.env.local`) |
| `npm run db:generate` | `prisma generate` |
| `npm run schema:apply` | `db:push` + `db:generate` |
| `npm run seed` | Seed database |
| `npm run build` | `prisma generate` + `next build` |
| `npm run build:next` | `next build` only |
| `npm run vercel-build` | Same as `build` (URA-style name for Vercel **Build Command**) |
| `npm run deploy` | `bash scripts/deploy.sh` — commit all, push `main` (override branch with `DEPLOY_BRANCH`) |
| `npm run migrate:*` / `fix:team-join-duplicates` | Game-era Prisma scripts; require **`schema.game.prisma`** swapped in as `schema.prisma` + `prisma generate` |

**Prisma CLI in full (generate, `db push`, validate, seed, CI):** [PRISMA_COMMANDS.md](./PRISMA_COMMANDS.md).

---

## 5. Regenerate the tree

After adding or moving files, refresh the printed tree:

```bash
npm run docs:tree
```

Copy the output into **§1** above if you want this file to stay perfectly in sync, or rely on the command for an always-current view.

---

## 6. Related docs

- [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md) — how schools register (pending → approve) and get an org admin / `/admin` dashboard
- [PRISMA_COMMANDS.md](./PRISMA_COMMANDS.md) — every Prisma CLI usage and npm wrapper in this repo
- [FLOWS.md](./FLOWS.md) — index of **user**, **multi-tenant**, **admin**, and **master** flow write-ups
- [openapi.yaml](./openapi.yaml) — HTTP API sketch
- [USER_STORIES.md](./USER_STORIES.md) — product stories
