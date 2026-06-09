# Vercel deploy — `odelpay.vercel.app`

**Vercel login:** `info.edutechos@gmail.com`  
**Team:** [odeldevelopers-projects](https://vercel.com/odeldevelopers-projects)  
**Project (dashboard name):** [odelhub-pay](https://vercel.com/odeldevelopers-projects/odelhub-pay/settings/domains)  
**Production domain:** **`https://odelpay.vercel.app`** (no trailing slash)  
**GitHub:** [openpayglobal/openpaygb](https://github.com/openpayglobal/openpaygb)

---

## Current status

| Check | Result |
|-------|--------|
| `https://odelpay.vercel.app/` | **200** — production deployment live |
| `GET /api/health` | **200** with `Authorization: Bearer <HEALTH_CHECK_SECRET>` |
| Vercel production env | **29** vars synced (DB, JWT, cron, webhooks, Telegram, TON) |
| Master Admin overrides | **33** vars in Deployment Environment (`/admin/master#deployment-environment`) |
| Vercel CLI | Logged in as **infoedutechos** — `npm run deployment:sync-vercel` to re-push env |
| GitHub **CI** (`main`) | **Green** — lint, test, tsc, build (with `SKIP_DB_AT_BUILD=true`) |

---

## Fix 1 — Vercel team access

1. Log in at [vercel.com](https://vercel.com) as **`info.edutechos@gmail.com`**.
2. [odelhub-pay → Settings → Members](https://vercel.com/odeldevelopers-projects/odelhub-pay/settings) — invite every GitHub committer (especially **infoedutechos**).
3. GitHub → **Settings → Emails** — commit email must match a Vercel team member.
4. Re-push `main` or **Redeploy** latest commit.

---

## Fix 2 — Connect Git

1. [Settings → Git](https://vercel.com/odeldevelopers-projects/odelhub-pay/settings/git)
2. Team: **odeldevelopers-projects**
3. Repo: **`openpayglobal/openpaygb`**
4. Production branch: **`main`**
5. Build: `npm run vercel-build` (`vercel.json`)

---

## Fix 3 — Environment variables

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_APP_URL` | `https://odelpay.vercel.app` |
| `DATABASE_URL` | MongoDB Atlas |
| `JWT_SECRET` | 32+ chars |
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `CRON_SECRET` | Random string |
| `ODELHUB_TON_WALLET_ADDRESS` | TON treasury |

Full list: [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)

---

## Fix 4 — Deploy & verify

1. Push to **`main`** — **done**; CI is green on [Actions](https://github.com/openpayglobal/openpaygb/actions).
2. Vercel **Deployments** → Production **Ready** (after Fix 1–3).
3. `GET https://odelpay.vercel.app/api/health` → JSON (not 404).

### Fix 4b — GitHub Action deploy (if Vercel Git hook stays blocked)

1. Vercel → [Account tokens](https://vercel.com/account/tokens) → create token (logged in as `info.edutechos@gmail.com`).
2. Project → **Settings → General** → copy **Project ID**; team **Settings** → **Team ID**.
3. GitHub repo → **Settings → Secrets → Actions** — add:

   | Secret | Value |
   |--------|--------|
   | `VERCEL_TOKEN` | Token from step 1 |
   | `VERCEL_ORG_ID` | `odeldevelopers-projects` team ID |
   | `VERCEL_PROJECT_ID` | `odelhub-pay` project ID |

4. Push to `main` or run workflow **Vercel Production Deploy** manually.
5. Workflow file: `.github/workflows/vercel-deploy.yml` (skips safely if secrets missing).

Local `.env.local`:

```env
NEXT_PUBLIC_APP_URL=https://odelpay.vercel.app
```

Telegram (after live):

```powershell
npm run telegram:set-webhook
npm run telegram:set-menu
```

---

## Master Admin → Vercel autonomous sync

**UI:** `https://odelpay.vercel.app/admin/master#deployment-environment`

| Variable | Where to get it |
|----------|-----------------|
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `prj_J5WZp67C2DB4zR6LzjLYZ0j8Nebk` — or Vercel → **odelhub-pay** → Settings → General → **Project ID** |
| `VERCEL_TEAM_ID` | `.vercel/project.json` → `team_HSziNLJNu74t46uP691K8XG4` — or Team → Settings → General → **Team ID** |
| `VERCEL_ACCESS_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) — create token while logged in as **info.edutechos@gmail.com** (needs project env read/write) |

These are stored encrypted in Master Admin overrides (not in `.env` — `VERCEL_PROJECT_ID` in `.env` breaks linked CLI).

**Local scripts:**

```powershell
npm run deployment:provision-sync   # generate secrets, save Master overrides, push to Vercel
npm run deployment:sync-vercel      # re-push registry values only
```

---

## CLI

```powershell
npx vercel login
npx vercel link
# Team: odeldevelopers-projects → Project: odelhub-pay (domain odelpay.vercel.app)
npx vercel env ls
npx vercel env pull .env.local
```

---

## Cron (`vercel.json`)

- `/api/cron/confirm-ton` — every 5 min
- `/api/cron/expire-pending-payments` — hourly
- `/api/cron/telegram-tuition-reminders` — Mondays 09:00 UTC

---

## Master sign-in

`https://odelpay.vercel.app/admin/login?master=1` — `oiptechcore@gmail.com`

---

## Related docs

- [DEPLOYMENT_ENV_PRODUCTION.md](./DEPLOYMENT_ENV_PRODUCTION.md) — production env sync summary
- [SCHOOL_WORKSPACE_SELF_REGISTER.md](./SCHOOL_WORKSPACE_SELF_REGISTER.md) — school self-registration, ODEL HUB Copilot, favicon fetch
