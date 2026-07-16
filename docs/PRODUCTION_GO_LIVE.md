# Production go-live checklist (ODELHUB Pay)

Use this after pushing code to `main` and connecting [Vercel](https://vercel.com).

## 1. Vercel project

1. Import or reconnect the GitHub repo.
2. Production domain: `odelpay.vercel.app` ([odeldevelopers-projects/odelpay](https://vercel.com/odeldevelopers-projects/odelpay/settings/domains)) — see [VERCEL_ODELPAY_DEPLOY.md](./VERCEL_ODELPAY_DEPLOY.md).
3. **Redeploy** after every env change.

If you see `DEPLOYMENT_NOT_FOUND`, the project was deleted or the domain points at a removed deployment — create a new deployment from the repo.

## 2. Required environment variables (Production)

Copy from your local `.env` (never commit `.env`). Use **Live** Mbiyo keys on production.

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | MongoDB Atlas |
| `JWT_SECRET` | Min 16 chars, random |
| `NEXT_PUBLIC_APP_URL` | `https://odelpay.vercel.app` (no trailing slash) |
| `NODE_ENV` | `production` (Vercel sets this automatically) |
| `CRON_SECRET` | Random; required for `/api/cron/*` |
| `ODELHUB_TON_WALLET_ADDRESS` | Real TON wallet (not placeholder) |
| `MBIYO_SECRET_KEY` | Mbiyo **Live** API key |
| `MBIYO_WEBHOOK_SECRET` | Same as Mbiyo dashboard Webhook Secret |
| `NEXT_PUBLIC_MBIYO_PUBLIC_KEY` | Mbiyo **Live** public key |
| `MBIYO_API_BASE_URL` | `https://dashboard.mbiyo.africa/api/v1` |
| `MOMO_WEBHOOK_SECRET` | If using MoMo webhooks |
| `TELEGRAM_WEBHOOK_SECRET` | If using Telegram bot |
| `RESEND_API_KEY` | School workspace verification email |
| `RESEND_FROM` | Verified sender (e.g. `ODEL HUB <noreply@yourdomain.com>`) |
| `LIVEPAY_API_KEY` | LivePay Bearer API key (Uganda MTN/Airtel) |
| `LIVEPAY_ACCOUNT_NUMBER` | LivePay business account number |
| `LIVEPAY_WEBHOOK_SECRET` | LivePay webhook signing secret (required in production) |

Optional: `LIVEPAY_WEBHOOK_URL` (if dashboard URL differs from `NEXT_PUBLIC_APP_URL`), `TONAPI_KEY`, `FX_LIVE_ENABLED`, `CHECKOUT_PLATFORM_FEE_UGX`, etc. — see [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md).

Workspace registration flow: [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md) · audit: [APP_STATUS_AUDIT.md](./APP_STATUS_AUDIT.md).

## 3. Mbiyo dashboard

| Field | Value |
|-------|--------|
| Webhook URL | `https://odelpay.vercel.app/api/webhooks/mbiyo` |
| Webhook Secret | Identical to `MBIYO_WEBHOOK_SECRET` on Vercel |

Details: [MBIYO_WEBHOOK_SETUP.md](./MBIYO_WEBHOOK_SETUP.md).

## 3b. LivePay dashboard

| Field | Value |
|-------|--------|
| Webhook URL | `https://<your-host>/api/webhooks/livepay` (same as `GET /api/public/livepay-config` → `webhookUrl`) |
| Webhook secret | Identical to `LIVEPAY_WEBHOOK_SECRET` on Vercel |

Checkout polls LivePay transaction status as a fallback when webhooks are delayed. See [LIVEPAY_INTEGRATION_ASSESSMENT.md](./LIVEPAY_INTEGRATION_ASSESSMENT.md).

## 4. Smoke tests (after deploy)

| Check | Expected |
|-------|----------|
| `GET /api/webhooks/mbiyo` | `OK` |
| `/` | Home loads |
| `/school/login` | School admin login |
| `/admin/login?master=1` | Master login |
| Small Mbiyo payin | Status moves from pending → confirmed |
| `GET /api/public/livepay-config` | `enabled: true` when LivePay keys set |
| `GET /api/webhooks/livepay` | `OK` |
| Small LivePay payin (UGX) | Waiting page → confirmed (webhook or status poll) |

## 5. Database (once per environment)

From your PC with production `DATABASE_URL`:

```bash
npm run db:push
npm run seed
npm run master:set-login
```

## 6. Local vs production keys

| Environment | Mbiyo API key | Mbiyo public key |
|-------------|---------------|------------------|
| Production (Vercel) | Live | Live |
| Local sandbox | Test | Test |

Do not mix Live and Test on the same deployment.
