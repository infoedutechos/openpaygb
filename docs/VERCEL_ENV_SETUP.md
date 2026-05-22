# Vercel environment variables (ODELHUB Pay)

Use this when creating a **new Vercel project** for this repository.

- **Root directory:** `.` (repository root — where `package.json` lives)
- **Framework:** Next.js
- **Build command:** `npm run vercel-build` or `npm run build` (both run `prisma generate && next build`)
- **Install command:** `npm install` (runs `postinstall`: Prisma generate + ton-pay crypto patch)

Copy variables into **Project → Settings → Environment Variables**. Apply to **Production** (and **Preview** if preview deploys should work).

**Never commit real secrets.** Replace every `REPLACE_*` value with your own before going live.

---

## Values you must supply (secrets & URLs)

| Name | Example format | Your value |
|------|----------------|------------|
| `DATABASE_URL` | `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/odelhub?retryWrites=true&w=majority` | From MongoDB Atlas → Connect |
| `JWT_SECRET` | 32+ random characters | e.g. output of `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Exact HTTPS URL users open (no trailing `/`) |
| `CRON_SECRET` | Random string | Required in production for `/api/cron/*` |
| `ODELHUB_TON_WALLET_ADDRESS` | `UQ...` (48-char TON address) | Settlement / platform TON wallet |
| `MOMO_WEBHOOK_SECRET` | Random string | Required in production if MoMo webhook is used |
| `MBIYO_WEBHOOK_SECRET` | Random string | Required in production if Mbiyo webhook is used |
| `TELEGRAM_WEBHOOK_SECRET` | Random string | Required in production if Telegram webhook is used |

After the first deploy, set `NEXT_PUBLIC_APP_URL` to the real Vercel URL and **redeploy**.

---

## 1. Required (core app)

| Name | Value for Vercel |
|------|------------------|
| `DATABASE_URL` | `REPLACE_MONGODB_ATLAS_CONNECTION_STRING` |
| `JWT_SECRET` | `REPLACE_JWT_SECRET_MIN_16_CHARS` |
| `NEXT_PUBLIC_APP_URL` | `https://REPLACE-YOUR-PROJECT.vercel.app` |
| `CRON_SECRET` | `REPLACE_CRON_SECRET` |
| `NODE_ENV` | `production` |

---

## 2. Required in production (webhooks & cron)

Enforced when `VERCEL_ENV=production` (see `lib/production-secrets.ts`). Routes return **503** if missing.

| Name | Value for Vercel |
|------|------------------|
| `CRON_SECRET` | `REPLACE_CRON_SECRET` (same as above) |
| `MOMO_WEBHOOK_SECRET` | `REPLACE_MOMO_WEBHOOK_SECRET` |
| `MBIYO_WEBHOOK_SECRET` | `REPLACE_MBIYO_WEBHOOK_SECRET` |
| `TELEGRAM_WEBHOOK_SECRET` | `REPLACE_TELEGRAM_WEBHOOK_SECRET` |

---

## 3. TON / tuition (defaults from codebase)

| Name | Value for Vercel |
|------|------------------|
| `ODELHUB_TON_WALLET_ADDRESS` | `REPLACE_TON_WALLET_ADDRESS` |
| `CHECKOUT_PLATFORM_FEE_UGX` | `0` |
| `DEFAULT_UGX_PER_TON` | `257000` |
| `FX_LIVE_ENABLED` | `true` |
| `FX_CACHE_TTL_SECONDS` | `300` |
| `TON_CONFIRM_ENABLED` | `true` |
| `TON_NETWORK` | `mainnet` |
| `PENDING_PAYMENT_TTL_HOURS` | `48` |
| `TONAPI_KEY` | `REPLACE_TONAPI_KEY` |

Optional TON API:

| Name | Value for Vercel |
|------|------------------|
| `TONCENTER_API_KEY` | `REPLACE_TONCENTER_KEY` or leave empty |

---

## 4. Ton Pay / TON Connect

| Name | Value for Vercel |
|------|------------------|
| `TON_PAY_API_KEY` | `REPLACE_TON_PAY_API_KEY` |
| `NEXT_PUBLIC_TON_PAY_API_KEY` | `REPLACE_TON_PAY_API_KEY` |
| `NEXT_PUBLIC_TON_PAY_CHAIN` | `mainnet` |

---

## 5. Mbiyo / OpenPayGlobal (mobile money)

| Name | Value for Vercel |
|------|------------------|
| `MBIYO_SECRET_KEY` | `REPLACE_MBIYO_SECRET_KEY` |
| `MBIYO_WEBHOOK_SECRET` | `REPLACE_MBIYO_WEBHOOK_SECRET` |
| `NEXT_PUBLIC_MBIYO_PUBLIC_KEY` | `REPLACE_MBIYO_PUBLIC_KEY` |
| `MBIYO_API_BASE_URL` | `https://dashboard.mbiyo.africa/api/v1` |

---

## 6. MoMo

| Name | Value for Vercel |
|------|------------------|
| `MOMO_PROVIDER` | `REPLACE_MOMO_PROVIDER` |
| `MOMO_SUBSCRIPTION_KEY` | `REPLACE_MOMO_SUBSCRIPTION_KEY` |
| `MOMO_COLLECTION_URL` | `REPLACE_MOMO_COLLECTION_URL` |
| `MOMO_WEBHOOK_SECRET` | `REPLACE_MOMO_WEBHOOK_SECRET` |

---

## 7. Telegram

| Name | Value for Vercel |
|------|------------------|
| `TELEGRAM_BOT_TOKEN` | `REPLACE_TELEGRAM_BOT_TOKEN` |
| `BOT_TOKEN` | `REPLACE_TELEGRAM_BOT_TOKEN` |
| `TELEGRAM_WEBHOOK_SECRET` | `REPLACE_TELEGRAM_WEBHOOK_SECRET` |
| `TELEGRAM_ORG_SLUG` | `default` |
| `TELEGRAM_ANNOUNCEMENT_CHANNEL_ID` | `REPLACE_CHANNEL_ID` or leave empty |
| `FORCE_TELEGRAM_AUTH` | `false` |
| `BYPASS_TELEGRAM_AUTH` | `false` |

Webhook URL after deploy:

`https://REPLACE-YOUR-PROJECT.vercel.app/api/webhooks/telegram`

Set webhook locally:

```bash
npm run telegram:set-webhook
```

(Uses `NEXT_PUBLIC_APP_URL` or Vercel’s `VERCEL_URL`.)

---

## 8. Telegram / UI (public)

| Name | Value for Vercel |
|------|------------------|
| `NEXT_PUBLIC_BOT_USERNAME` | `REPLACE_BOT_USERNAME` |
| `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH` | `false` |
| `NEXT_PUBLIC_CHANNEL_LINK` | `https://t.me/REPLACE_CHANNEL` |
| `NEXT_PUBLIC_SUPPORT_TELEGRAM_URL` | `https://t.me/REPLACE_SUPPORT` |
| `NEXT_PUBLIC_SUPPORT_PHONE` | `+256000000000` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@REPLACE_DOMAIN.com` |
| `NEXT_PUBLIC_SKIP_DISTRICT_GATE` | `false` |
| `NEXT_PUBLIC_DEV_DISPLAY_NAME` | *(empty)* |

---

## 9. Google OAuth (student sign-in)

| Name | Value for Vercel |
|------|------------------|
| `GOOGLE_CLIENT_ID` | `REPLACE.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `REPLACE_GOOGLE_CLIENT_SECRET` |

Authorized redirect URI in Google Cloud Console:

`https://REPLACE-YOUR-PROJECT.vercel.app/api/auth/google/student/callback`

---

## 10. Email (Resend — admin password reset)

| Name | Value for Vercel |
|------|------------------|
| `RESEND_API_KEY` | `re_REPLACE_RESEND_API_KEY` |
| `RESEND_FROM` | `ODELHUB Pay <noreply@REPLACE_DOMAIN.com>` |

---

## 11. Admin / seed (do not use on Vercel for production admin)

Run `npm run db:push`, `npm run seed`, `npm run master:set-login` **once** from a trusted machine with production `DATABASE_URL`.

| Name | Value for Vercel |
|------|------------------|
| `ADMIN_PASSWORD` | *(leave unset)* |
| `ACCESS_ADMIN` | `false` |
| `ADMIN_ITEM_PASSWORD` | *(leave unset)* |
| `ADMIN_MANUAL_PAYMENT_CONFIRM` | `false` |

Optional seed overrides (local only):

| Name | Value for Vercel |
|------|------------------|
| `SEED_ADMIN_EMAIL` | *(leave unset on Vercel)* |
| `SEED_ADMIN_PASSWORD` | *(leave unset on Vercel)* |
| `SEED_MASTER_EMAIL` | *(leave unset on Vercel)* |
| `SEED_MASTER_PASSWORD` | *(leave unset on Vercel)* |

---

## 12. Optional / advanced

| Name | Value for Vercel |
|------|------------------|
| `HEALTH_CHECK_SECRET` | `REPLACE_HEALTH_CHECK_SECRET` |
| `BRIDGE_WEBHOOK_URL` | `https://REPLACE_BRIDGE_URL` |
| `BRIDGE_WEBHOOK_SECRET` | `REPLACE_BRIDGE_WEBHOOK_SECRET` |
| `EXCHANGE_SWAP_URL` | `https://REPLACE_SWAP_URL` |
| `OPENAI_API_KEY` | `sk-REPLACE` |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` |
| `PRISMA_VERBOSE_ERRORS` | `false` |
| `MONGODB_URI` | *(leave unset — use `DATABASE_URL`)* |
| `GITHUB_TOKEN` | *(optional — docs sync scripts only)* |

---

## 13. Set by Vercel (do not add manually)

| Name | Notes |
|------|--------|
| `VERCEL` | `1` |
| `VERCEL_URL` | e.g. `your-project.vercel.app` |
| `VERCEL_ENV` | `production` / `preview` / `development` |

Optional mirror for client:

| Name | Value for Vercel |
|------|------------------|
| `NEXT_PUBLIC_VERCEL_ENV` | `production` |

---

## Copy-paste block (Production)

Paste into Vercel’s bulk editor or add one-by-one. Replace every `REPLACE_*` value.

```env
# --- Core (required) ---
DATABASE_URL=REPLACE_MONGODB_ATLAS_CONNECTION_STRING
JWT_SECRET=REPLACE_JWT_SECRET_MIN_16_CHARS
NEXT_PUBLIC_APP_URL=https://REPLACE-YOUR-PROJECT.vercel.app
CRON_SECRET=REPLACE_CRON_SECRET
NODE_ENV=production

# --- Production webhook/cron guards ---
MOMO_WEBHOOK_SECRET=REPLACE_MOMO_WEBHOOK_SECRET
MBIYO_WEBHOOK_SECRET=REPLACE_MBIYO_WEBHOOK_SECRET
TELEGRAM_WEBHOOK_SECRET=REPLACE_TELEGRAM_WEBHOOK_SECRET

# --- TON / tuition ---
ODELHUB_TON_WALLET_ADDRESS=REPLACE_TON_WALLET_ADDRESS
CHECKOUT_PLATFORM_FEE_UGX=0
DEFAULT_UGX_PER_TON=257000
FX_LIVE_ENABLED=true
FX_CACHE_TTL_SECONDS=300
TON_CONFIRM_ENABLED=true
TON_NETWORK=mainnet
PENDING_PAYMENT_TTL_HOURS=48
TONAPI_KEY=REPLACE_TONAPI_KEY

# --- Ton Pay ---
TON_PAY_API_KEY=REPLACE_TON_PAY_API_KEY
NEXT_PUBLIC_TON_PAY_API_KEY=REPLACE_TON_PAY_API_KEY
NEXT_PUBLIC_TON_PAY_CHAIN=mainnet

# --- Mbiyo / OpenPayGlobal ---
MBIYO_SECRET_KEY=REPLACE_MBIYO_SECRET_KEY
NEXT_PUBLIC_MBIYO_PUBLIC_KEY=REPLACE_MBIYO_PUBLIC_KEY
MBIYO_API_BASE_URL=https://dashboard.mbiyo.africa/api/v1

# --- MoMo ---
MOMO_PROVIDER=REPLACE_MOMO_PROVIDER
MOMO_SUBSCRIPTION_KEY=REPLACE_MOMO_SUBSCRIPTION_KEY
MOMO_COLLECTION_URL=REPLACE_MOMO_COLLECTION_URL

# --- Telegram ---
TELEGRAM_BOT_TOKEN=REPLACE_TELEGRAM_BOT_TOKEN
BOT_TOKEN=REPLACE_TELEGRAM_BOT_TOKEN
TELEGRAM_ORG_SLUG=default
FORCE_TELEGRAM_AUTH=false
BYPASS_TELEGRAM_AUTH=false
NEXT_PUBLIC_BOT_USERNAME=REPLACE_BOT_USERNAME
NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH=false

# --- Google OAuth (optional) ---
GOOGLE_CLIENT_ID=REPLACE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=REPLACE_GOOGLE_CLIENT_SECRET

# --- Email (optional) ---
RESEND_API_KEY=re_REPLACE_RESEND_API_KEY
RESEND_FROM=ODELHUB Pay <noreply@REPLACE_DOMAIN.com>

# --- Admin (keep off in production Vercel) ---
ACCESS_ADMIN=false
ADMIN_MANUAL_PAYMENT_CONFIRM=false
```

---

## Minimal block (tuition + TON only)

If you are not enabling MoMo, Mbiyo, Telegram, Google, or email yet, still set webhook secrets to random values (production enforces them on webhook routes).

```env
DATABASE_URL=REPLACE_MONGODB_ATLAS_CONNECTION_STRING
JWT_SECRET=REPLACE_JWT_SECRET_MIN_16_CHARS
NEXT_PUBLIC_APP_URL=https://REPLACE-YOUR-PROJECT.vercel.app
CRON_SECRET=REPLACE_CRON_SECRET
NODE_ENV=production
ODELHUB_TON_WALLET_ADDRESS=REPLACE_TON_WALLET_ADDRESS
CHECKOUT_PLATFORM_FEE_UGX=0
DEFAULT_UGX_PER_TON=257000
FX_LIVE_ENABLED=true
FX_CACHE_TTL_SECONDS=300
TON_CONFIRM_ENABLED=true
TON_NETWORK=mainnet
PENDING_PAYMENT_TTL_HOURS=48
TONAPI_KEY=REPLACE_TONAPI_KEY
MOMO_WEBHOOK_SECRET=REPLACE_MOMO_WEBHOOK_SECRET
MBIYO_WEBHOOK_SECRET=REPLACE_MBIYO_WEBHOOK_SECRET
TELEGRAM_WEBHOOK_SECRET=REPLACE_TELEGRAM_WEBHOOK_SECRET
```

---

## After deploy checklist

1. Set `NEXT_PUBLIC_APP_URL` to the live URL → **Redeploy**.
2. From your PC (production `DATABASE_URL`): `npm run db:push` then `npm run seed` (once).
3. `npm run master:set-login` if you need a master admin.
4. `npm run telegram:set-webhook` if using Telegram.
5. Point provider webhooks:
   - MoMo → `https://<domain>/api/webhooks/momo`
   - Mbiyo → `https://<domain>/api/webhooks/mbiyo`
   - Telegram → `https://<domain>/api/webhooks/telegram`
6. Smoke test: `/`, `/pay/default`, `/admin/login`, `/api/manifest/tonconnect`.

---

## Related docs

- [MBIYO_WEBHOOK_SETUP.md](./MBIYO_WEBHOOK_SETUP.md) — Mbiyo dashboard webhook URL, secret, IP whitelist
- [VERCEL_AUTO_DEPLOY.md](./VERCEL_AUTO_DEPLOY.md) — enable deploy on every `git push` to `main`
- [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) — MongoDB, cron, serverless model
- [.env.example](../.env.example) — full local template (same variable names)
- [README.md](./README.md) — local setup and seed
