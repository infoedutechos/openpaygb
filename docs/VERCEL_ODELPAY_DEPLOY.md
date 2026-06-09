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
| `https://odelpay.vercel.app/` | **404** `DEPLOYMENT_NOT_FOUND` — hostname registered, **no production deployment** |
| Vercel UI | **“No Production Deployment”** — domain not serving traffic |
| Vercel Git check | **Failed** — *Git author **infoedutechos** must have access to the project on Vercel* |
| GitHub **CI / lint** | **Failed** — `prisma validate` without `DATABASE_URL` (fixed in `.github/workflows/ci.yml`) |

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

1. Push to **`main`** (CI green).
2. Vercel **Deployments** → Production **Ready**.
3. `GET https://odelpay.vercel.app/api/health` → JSON (not 404).

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
