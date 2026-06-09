# Production deployment — `odelpay.vercel.app`

**Last updated:** June 2026  
**Production URL:** [https://odelpay.vercel.app](https://odelpay.vercel.app)  
**Vercel team:** [odeldevelopers-projects](https://vercel.com/odeldevelopers-projects)  
**Project:** [odelhub-pay](https://vercel.com/odeldevelopers-projects/odelhub-pay/settings)  
**CLI account:** `infoedutechos` (`info.edutechos@gmail.com`)

---

## Current status

| Check | Result |
|-------|--------|
| Homepage `GET /` | **200** |
| Health `GET /api/health` | **401** without secret; **200** with `Authorization: Bearer <HEALTH_CHECK_SECRET>` |
| Vercel production env | **29** variables synced |
| Master Admin overrides | **33** encrypted values at `/admin/master#deployment-environment` |
| Telegram webhook | `https://odelpay.vercel.app/api/webhooks/telegram` |

---

## Vercel credentials (Master Admin autonomous sync)

| Variable | Where to get it |
|----------|-----------------|
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `prj_J5WZp67C2DB4zR6LzjLYZ0j8Nebk` — or Project → Settings → General |
| `VERCEL_TEAM_ID` | `.vercel/project.json` → `team_HSziNLJNu74t46uP691K8XG4` — or Team → Settings → General |
| `VERCEL_ACCESS_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) (logged in as **infoedutechos**) |

Store token + IDs in **Master Admin → Deployment Environment**. Do **not** put `VERCEL_PROJECT_ID` in `.env` — it breaks the linked Vercel CLI.

---

## Provisioned production secrets

Generated and synced via `npm run deployment:provision-sync`:

- `HEALTH_CHECK_SECRET` — protects `/api/health` in production
- `CRON_SECRET` — Vercel cron auth for `/api/cron/*`
- `MOMO_WEBHOOK_SECRET`, `MBIYO_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_SECRET`
- `LIVEPAY_WEBHOOK_SECRET`, `RELWORX_WEBHOOK_KEY`, `VIXONPAY_WEBHOOK_SECRET`

Values live in local `.env` and Master Admin overrides (never commit `.env`).

**Still manual:** `ODELHUB_TON_WALLET_ADDRESS` — replace placeholder with a real `UQ…` treasury wallet, then `npm run deployment:sync-vercel`.

---

## Scripts

```powershell
npm run deployment:provision-sync   # generate secrets, save Master overrides, push to Vercel
npm run deployment:sync-vercel      # re-push registry values only (no secret regeneration)
npm run telegram:set-webhook        # register Telegram webhook on production URL
npx vercel deploy --prod            # redeploy after env changes
```

Script: `scripts/provision-and-sync-deployment-env.cjs`

---

## Verification

```powershell
# Homepage
curl -s -o NUL -w "%{http_code}" https://odelpay.vercel.app/

# Health (use value from .env HEALTH_CHECK_SECRET)
curl -s -H "Authorization: Bearer YOUR_HEALTH_CHECK_SECRET" https://odelpay.vercel.app/api/health
```

---

## Related docs

- [VERCEL_ODELPAY_DEPLOY.md](./VERCEL_ODELPAY_DEPLOY.md) — connect Git, team access, cron
- [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) — full variable list
- [PRODUCTION_GO_LIVE.md](./PRODUCTION_GO_LIVE.md) — go-live checklist
