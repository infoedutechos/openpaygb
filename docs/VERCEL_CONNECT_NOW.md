# Connect ODELHUB Pay to Vercel (openpayglobal/openpaygb)

Use this checklist after pushing `programme-duration-management` (or `main`).

**Production project:** see **[VERCEL_ODELPAY_DEPLOY.md](./VERCEL_ODELPAY_DEPLOY.md)** — Vercel `info.edutechos@gmail.com`, team **odeldevelopers-projects**, project **odelhub-pay**, URL **`https://odelpay.vercel.app`**.

## 1. Import the GitHub repo (one time)

1. Open [vercel.com/new](https://vercel.com/new).
2. Sign in with the GitHub account that can access **`openpayglobal/openpaygb`**.
3. **Import** `openpayglobal/openpaygb`.
4. **Root Directory:** `.` (repository root — where `package.json` lives).
5. **Framework Preset:** Next.js (auto-detected).
6. **Build Command:** `npm run vercel-build` (matches `vercel.json`).
7. **Install Command:** `npm install`.
8. **Production Branch:** `main` for live, or `programme-duration-management` while that branch is your release line.

Do **not** deploy until required env vars are set (step 2).

## 2. Environment variables (before first deploy)

Copy from [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md). Minimum for a successful build + runtime:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | MongoDB Atlas connection string |
| `JWT_SECRET` | 32+ random characters |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-PROJECT.vercel.app` (update after first deploy, then redeploy) |
| `CRON_SECRET` | Random string (cron routes in `vercel.json`) |
| `NODE_ENV` | `production` |

Production webhooks (503 if missing when live): `MOMO_WEBHOOK_SECRET`, `MBIYO_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_SECRET`.

TON tuition: `ODELHUB_TON_WALLET_ADDRESS`, optional `TONAPI_KEY`.

Full list: [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md).  
Master Admin can export a redacted env audit after login: **Manager → Environment**.

## 3. MongoDB Atlas

1. Atlas → **Network Access** → allow **0.0.0.0/0** (or Vercel’s IP ranges) so serverless functions can connect.
2. Confirm database user password matches `DATABASE_URL`.

## 4. Deploy

1. Click **Deploy** in Vercel.
2. When the URL is assigned, set `NEXT_PUBLIC_APP_URL` to that exact HTTPS origin (no trailing slash).
3. **Redeploy** so TON Connect manifest and emails use the correct host.

## 5. Auto-deploy on push

After import, Vercel adds a GitHub webhook. Each push to the production branch triggers a new deployment.

```bash
git push origin programme-duration-management   # preview (if not production branch)
git push origin main                            # production (recommended for live)
```

Confirm under **Project → Settings → Git**: repository `openpayglobal/openpaygb`.

## 6. Optional: Vercel CLI on your machine

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.local
```

CLI linking requires a valid token (`vercel login`). The dashboard import (steps 1–4) is enough for CI/CD from GitHub.

## 7. Post-deploy smoke checks

- `https://YOUR-PROJECT.vercel.app/api/health`
- `https://YOUR-PROJECT.vercel.app/docs` — documentation hub
- `https://YOUR-PROJECT.vercel.app/admin/login` — tuition admin
- `https://YOUR-PROJECT.vercel.app/admin/master` — master console (master role)

## 8. Cron jobs

`vercel.json` registers:

- `/api/cron/confirm-ton` — every 5 minutes
- `/api/cron/expire-pending-payments` — hourly
- `/api/cron/telegram-tuition-reminders` — weekly (Mondays 09:00 UTC)

Requires `CRON_SECRET` (Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically) and a **Vercel Pro** plan (or compatible cron support on your team).

**Production Telegram env (verify in Vercel → Settings → Environment Variables):**

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://odelpay.vercel.app` (no trailing slash) |
| `TELEGRAM_BOT_TOKEN` or `BOT_TOKEN` | BotFather token for @ODELHUBPayBot |
| `CRON_SECRET` | Random 32+ char string |
