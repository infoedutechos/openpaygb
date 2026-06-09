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
| `https://odelpay.vercel.app/` | **404** `DEPLOYMENT_NOT_FOUND` — domain registered, **no successful production deployment yet** |
| GitHub **CI** (`main`) | **Green** — lint, test, tsc, build (with `SKIP_DB_AT_BUILD=true`) |
| Latest `main` commits | `ab895c4` CI build fix · `2872044` platform features |
| Vercel Git check | Often **blocked** — *Git author must have access to project* — fix in dashboard |
| Vercel CLI | Not logged in on dev machine — use dashboard or GitHub Action fallback |

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
