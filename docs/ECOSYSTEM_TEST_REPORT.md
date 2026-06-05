# Ecosystem test report

**Date:** 2026-06-04 · **Command:** `npm run verify` + `npm run test:ecosystem` + `npm run docs:inventory`

---

## Executive summary

| Layer | Result |
|-------|--------|
| Static (lint, 170 unit tests, TypeScript, Prisma schema) | **Pass** (after email module split) |
| Live dev server + MongoDB Atlas | **Pass** |
| Public tuition surfaces (pay, login, register, webhooks) | **Pass** (26/26 smoke checks) |
| LivePay (config, webhooks, env) | **Pass** — enabled locally |
| Docs inventory | **Regenerated** — API + UI CSV/MD |

**Overall:** Tuition ecosystem is **healthy** on this machine with dev server running. Production still needs public HTTPS webhook URL for LivePay (tunnel or deployed host).

---

## 1. Automated checks

| Check | Detail |
|-------|--------|
| `npm run verify` | ESLint clean · Vitest 170 tests · `tsc --noEmit` · `prisma validate` |
| `npm run test:ecosystem` | Env, DB health, LivePay, webhook probes, pages, workspace status, legacy 410 |
| `npm run docs:inventory` | `API_INVENTORY.csv`, `UI_ROUTES.csv`, `UI_VS_CODEBASE.md` |

Re-run anytime:

```powershell
npm run dev:clean    # if server not up
npm run verify
npm run test:ecosystem
```

---

## 2. Ecosystem smoke matrix (localhost)

| Area | Endpoint / page | Result |
|------|-----------------|--------|
| Database | `GET /api/health` | `db: connected` |
| LivePay | `GET /api/public/livepay-config` | `enabled: true`, MTN/AIRTEL, webhook URL set |
| Webhooks | `GET /api/webhooks/livepay`, `/mbiyo` | 200 OK probes |
| Auth shell | `GET /api/auth/me` | Valid JSON shape |
| Tenant | `GET /api/public/workspace-status?slug=default` | `active` |
| Deprecation | `POST /api/collect/momo` | 410 Gone |
| Payer UI | `/`, `/pay`, `/pay/default` | 200 |
| School | `/school/login`, `/admin/register` | 200 |
| Student | `/student/login` | 200 |

---

## 3. Product flows (code + docs aligned)

| Flow | Status | Notes |
|------|--------|-------|
| School register → email verify → master approve → org admin | Implemented | Resend required in prod |
| Guest pay (TON + Mbiyo + LivePay) | Implemented | `PayWizard` + `/api/public/checkout/*` |
| LivePay confirm | Webhook HMAC + status poll on `/api/payments/:id/public` | Local webhook needs tunnel |
| Master console | `/admin/master/*` | Org, programmes, backup, LivePay env |
| School admin hub | `/admin/*` tuition shell | Programmes, students, payments |
| Student portal | `/student`, `/my` | Claim + login |
| Security | IDOR/receipt/webhook hardening | See `SECURITY_HARDENING.md` |
| URA game surface | Legacy routes coexist | Out of tuition smoke scope |

---

## 4. Inventory scale

- **~239 API routes** in `docs/API_INVENTORY.csv` (tuition + URA game)
- **59 UI pages** in `docs/UI_ROUTES.csv`
- Tuition-critical LivePay APIs: `livepay-start`, `livepay-config`, `webhooks/livepay`

---

## 5. Warnings (operational, not code defects)

| Item | Action |
|------|--------|
| LivePay webhook on `localhost` | LivePay cannot POST to localhost — use ngrok/Cloudflare Tunnel + update `NEXT_PUBLIC_APP_URL` or `LIVEPAY_WEBHOOK_URL` |
| Atlas blips | Retries + degraded UI already in app; check Atlas IP allowlist if persistent |
| `npm run build` | Not run in this pass (slow); run before production deploy |
| URA game APIs | ~200 routes without unified `apiErrorResponse` — backlog P4, tuition unaffected |

---

## 6. Fixes applied during this pass

- Added **`npm run test:ecosystem`** (`scripts/ecosystem-smoke.cjs`)
- Updated **`HOLISTIC_APP_AUDIT.md`** — LivePay marked integrated
- Split **`organization-registration-email-content.ts`** — faster, reliable unit tests (no Prisma import in email HTML tests)

---

## Related

- [APP_STATUS_AUDIT.md](./APP_STATUS_AUDIT.md)
- [HOLISTIC_APP_AUDIT.md](./HOLISTIC_APP_AUDIT.md)
- [PRODUCTION_GO_LIVE.md](./PRODUCTION_GO_LIVE.md)
- [LIVEPAY_INTEGRATION_ASSESSMENT.md](./LIVEPAY_INTEGRATION_ASSESSMENT.md)
