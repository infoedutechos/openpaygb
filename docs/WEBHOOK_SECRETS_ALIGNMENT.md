# Webhook secrets alignment (Mbiyo, MoMo, LivePay)

**Production app:** `https://odelpay.vercel.app`  
**Last updated:** 2026-06-03

This guide aligns PSP dashboard webhook settings with ODEL HUB Pay environment variables. The app **verifies** inbound webhooks using these secrets; a mismatch causes silent payment failures (webhooks rejected with 401/403).

---

## Quick check

```powershell
npm run webhooks:alignment-check
```

Or hit the public API (no secret values returned):

- `GET /api/public/webhook-alignment` — all three rails
- `GET /api/public/mbiyo-config` — Mbiyo URL + configured flag
- `GET /api/public/momo-config` — MoMo URL + configured flag
- `GET /api/public/livepay-config` — LivePay URL + configured flag

Master Admin → **Deployment environment** also shows per-group webhook URLs and whether secrets are set.

---

## Alignment table

| Provider | Webhook URL | Env var (must match dashboard) | Auth mechanism |
|----------|-------------|--------------------------------|----------------|
| **Mbiyo** | `https://odelpay.vercel.app/api/webhooks/mbiyo` | `MBIYO_WEBHOOK_SECRET` | HMAC-SHA256 of **raw POST body** → `Signature` or `X-Signature` header |
| **MoMo bridge** | `https://odelpay.vercel.app/api/webhooks/momo` | `MOMO_WEBHOOK_SECRET` | Plain secret → `x-momo-webhook-secret` request header |
| **LivePay** | `https://odelpay.vercel.app/api/webhooks/livepay` (or `LIVEPAY_WEBHOOK_URL` override) | `LIVEPAY_WEBHOOK_SECRET` | HMAC `X-Webhook-Signature` (legacy: `x-livepay-webhook-secret`) |

---

## Step-by-step per provider

### Mbiyo

1. Open [Mbiyo API profile](https://dashboard.mbiyo.africa/user/profile/index/api).
2. Set **Webhook URL** to the value from `GET /api/public/mbiyo-config` → `webhookUrl`.
3. Set **Webhook Secret** to the **exact** value of `MBIYO_WEBHOOK_SECRET` in Vercel / Master Admin overrides.
4. Ensure `MBIYO_SECRET_KEY` and `NEXT_PUBLIC_MBIYO_PUBLIC_KEY` are also set (checkout + production re-fetch).
5. Optional: IP allowlist — Vercel egress is dynamic; see [MBIYO_WEBHOOK_SETUP.md](./MBIYO_WEBHOOK_SETUP.md).
6. Smoke: `curl https://odelpay.vercel.app/api/webhooks/mbiyo` → `OK`.

Detailed guide: [MBIYO_WEBHOOK_SETUP.md](./MBIYO_WEBHOOK_SETUP.md).

### MoMo bridge

1. In your upstream MoMo/collect bridge configuration, set callback URL to `GET /api/public/momo-config` → `webhookUrl`.
2. Configure the bridge to send header `x-momo-webhook-secret` with the value of `MOMO_WEBHOOK_SECRET`.
3. Ensure `MOMO_COLLECTION_URL` and `MOMO_SUBSCRIPTION_KEY` are set for outbound collect.
4. Smoke: `curl https://odelpay.vercel.app/api/webhooks/momo` → `OK`.

There is no Mbiyo-style public dashboard doc for MoMo — alignment is via your bridge operator.

### LivePay

1. Open LivePay merchant dashboard → Webhooks.
2. Set URL to `GET /api/public/livepay-config` → `webhookUrl` (or set `LIVEPAY_WEBHOOK_URL` if dashboard requires a different host).
3. Set webhook signing secret to match `LIVEPAY_WEBHOOK_SECRET`.
4. Whitelist server IPs for API calls (collect already uses allowlist) — see [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md).
5. Smoke: `curl https://odelpay.vercel.app/api/webhooks/livepay` → `OK`.

---

## Generating / syncing secrets

```powershell
# Generate missing secrets, save to Master Admin + .env, push to Vercel
npm run deployment:provision-sync

# Re-push existing registry values only
npm run deployment:sync-vercel
```

**Important:** After `deployment:provision-sync` **auto-generates** new webhook secrets, you **must** paste the same values into each PSP dashboard. The repo does not push secrets to Mbiyo/LivePay/MoMo APIs.

Preferred flow for Mbiyo:

1. Generate once (`openssl rand -hex 32` or provision script).
2. Paste into Mbiyo dashboard first.
3. Mirror into Vercel / Master Admin `MBIYO_WEBHOOK_SECRET`.

---

## Verification after alignment

```powershell
npm run test:ecosystem
npm run verify
```

Production payments should confirm via webhooks within seconds. If stuck on `pending`, check Vercel logs for `[webhooks/mbiyo]`, `[webhooks/momo]`, or `[webhooks/livepay]` auth failures.

---

## Related

- [DEPLOYMENT_ENV_PRODUCTION.md](./DEPLOYMENT_ENV_PRODUCTION.md)
- [PRODUCTION_GO_LIVE.md](./PRODUCTION_GO_LIVE.md)
- [INTEGRATION_HARDENING.md](./INTEGRATION_HARDENING.md)
