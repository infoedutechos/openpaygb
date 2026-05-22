# Deployment architecture (MongoDB · Vercel · GitHub · Telegram)

This app is a **Next.js 15** project on the **App Router**. There is **no separate Node host** for the API: every file under `app/api/**/route.ts` is deployed as a **Vercel Serverless Function**. Requests to `https://<your-domain>/api/...` invoke those functions automatically.

## Vercel (frontend + backend in one project)

| Layer | How it runs on Vercel |
|--------|------------------------|
| **UI** | Static / SSR / client components from `app/` — CDN + Node where needed |
| **Backend** | Each `route.ts` under `app/api/` becomes a **serverless function** at the same URL path (`/api/...`) |
| **Cron** | `vercel.json` schedules `GET /api/cron/confirm-ton` (TON confirmation job) |

**Build:** Vercel runs your `build` script from `package.json` (`prisma generate && next build`). Prisma Client is generated during install/build.

**Project settings (checklist):**

- **Root directory:** repository root (where `package.json` lives).
- **Framework preset:** Next.js (auto).
- **Environment variables:** see **[VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)** (copy-paste list for Vercel) or `.env.example` locally. Minimum for tuition + TON: `DATABASE_URL`, `JWT_SECRET`, `ODELHUB_TON_WALLET_ADDRESS`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` (required in production for `/api/cron/*`), `MOMO_WEBHOOK_SECRET`, `MBIYO_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, optional `TONAPI_KEY`, `TON_PAY_API_KEY`, `HEALTH_CHECK_SECRET`.

## MongoDB (Atlas)

- Create a cluster and a database user; connection string → **`DATABASE_URL`** in Vercel.
- **Network access:** allow Vercel’s outbound IPs or, for development, `0.0.0.0/0` (tighten for production if your security model requires it).
- Prisma uses **`@prisma/client`** with the MongoDB provider; the app reuses a **single `PrismaClient` per serverless isolate** (`lib/prisma.ts`) to reduce connection churn.

## GitHub

- Connect the repo to Vercel (**Import Project** → select GitHub repo).
- Pushes to the tracked branch trigger **production** (or **preview**) deployments.
- Optional: use `npm run deploy` locally (`scripts/deploy.sh`) to commit, push, and rely on Vercel’s Git integration to build.

## Telegram

- **Bot:** create with [@BotFather](https://t.me/BotFather) → **`TELEGRAM_BOT_TOKEN`** in Vercel.
- **Webhook:** must point at your deployed API route (a Vercel Function), e.g.  
  `https://<your-production-domain>/api/webhooks/telegram`
- **Secret:** set `TELEGRAM_WEBHOOK_SECRET` in Vercel and pass the same value as `secret_token` when calling `setWebhook`. Telegram sends it back as **`X-Telegram-Bot-Api-Secret-Token`**; your route should validate it.
- **Local / CI helper:** `npm run telegram:set-webhook` runs `scripts/set-telegram-webhook.ts` (uses `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` for the base URL).

## MoMo and other `/api/*` routes

Same model: webhooks (e.g. `/api/webhooks/momo`), checkout, auth, and game APIs are all **individual serverless functions** colocated with the app. No extra “API server” deployment step.

## Limits and tuning

- **Function duration:** `app/api/cron/confirm-ton/route.ts` sets `maxDuration` for TonAPI work. On **Vercel Hobby**, the platform may still cap execution time (see [Vercel limits](https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration)); upgrade or simplify the job if cron times out.
- **Cold starts:** first request after idle can be slower; keep DB pooling and external API calls reasonable.

## Related files

- `vercel.json` — cron path + schedule  
- `.env.example` — full env template  
- `lib/prisma.ts` — Prisma singleton for serverless  

For product-specific checklists, see other docs in `docs/` as needed.
