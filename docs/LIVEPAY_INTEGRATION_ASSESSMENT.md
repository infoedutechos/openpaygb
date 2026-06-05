# LivePay integration assessment

**Reference:** [LivePay API documentation — Overview](https://docs.livepay.me/overview)  
**ODEL HUB Pay:** **OpenPayGB** is the payer-facing mobile-money brand. **Rails** are **Mbiyo** (ledger `mbiyo`) and **LivePay** (ledger `livepay`), plus legacy **MoMo bridge** and **TON**.

---

## LivePay overview (vendor)

| Capability | LivePay |
|------------|---------|
| REST API | Deposits, withdrawals, balance, transaction history, status |
| Uganda | UGX — **AIRTEL**, **MTN** |
| Other markets | Kenya (KES), Ghana (GHS), Cameroon (XAF) |
| Webhooks | Transaction event notifications |
| Onboarding | Register → verify account → API keys → go live |

---

## Current ODEL HUB Pay stack (Uganda tuition)

| Rail | Implementation | Entry |
|------|----------------|-------|
| TON | Ton Pay + cron confirm | `/api/public/checkout/ton-pay-transfer` |
| Mbiyo | MbiyoPay API + webhook (OpenPayGB brand) | `/api/public/checkout/mbiyo-start`, `/api/webhooks/mbiyo` |
| MoMo bridge | Collect + webhook | `/api/collect/momo`, `/api/webhooks/momo` |
| Generic PSP | `MobileMoneyProvider` | `/api/webhooks/provider/{code}` |

Guest checkout is centralized in **`PayWizard`** + **`/api/public/checkout/*`** (legacy `/api/collect/*` is deprecated).

---

## Fit analysis

| Requirement | LivePay | Current app |
|-------------|---------|-------------|
| UGX MTN/Airtel | Yes | Partially via MoMo bridge / master-configured providers |
| Webhook confirmation | Yes | Yes (Mbiyo, MoMo, provider routes) |
| Amount verification | Documented in vendor API | Implemented in `lib/webhook-payment-confirm.ts` |
| Multi-country | Yes (4 countries) | Uganda-first; Mbiyo network limits UG payin |
| School tenant isolation | N/A (platform keys) | Per-org wallets/fees at master level |

**LivePay would be a fourth PSP option**, not a drop-in replacement for Mbiyo without new env keys, webhook route, checkout UI branch, and `PaymentRail` enum value.

---

## Recommended integration path (if adopted)

1. **Spike** — Authenticate, validate MSISDN, request-money sandbox for UGX MTN.
2. **Model** — Add `livepay` to `PaymentRail` or map to `momo_bridge` with provider code `livepay`.
3. **API** — `app/api/public/checkout/livepay-start/route.ts` mirroring `mbiyo-start`.
4. **Webhook** — `app/api/webhooks/livepay/route.ts` with signature verify + amount check.
5. **Master UI** — Provider row in `MasterMobileMoneyProviders` or env-only platform keys.
6. **Docs** — Update `PRODUCTION_GO_LIVE.md`, `USER_FLOW.md`, `API_INVENTORY.csv`.

**Effort estimate:** Medium (1–2 sprints) assuming LivePay webhook shape is stable and Uganda production keys are available.

---

## Implementation (2026-06-04)

| Piece | Path |
|-------|------|
| Client | `lib/livepay/client.ts` |
| Guest checkout | `POST /api/public/checkout/livepay-start` |
| Webhook | `POST /api/webhooks/livepay` |
| Config probe | `GET /api/public/livepay-config` |
| Pay UI | `PayWizard` — Uganda LivePay block when configured |
| Env | `LIVEPAY_API_KEY`, `LIVEPAY_ACCOUNT_NUMBER`, `LIVEPAY_WEBHOOK_SECRET`, optional `LIVEPAY_WEBHOOK_URL` |
| Webhook verify | `X-Webhook-Signature` HMAC per [LivePay webhooks](https://docs.livepay.me/webhooks); legacy `x-livepay-webhook-secret` for manual tests |
| Status poll | `GET /api/payments/:id/public` syncs via LivePay `transaction-status` when webhook is slow |

Configure webhook URL in LivePay dashboard — use `webhookUrl` from `GET /api/public/livepay-config`

## Decision (current)

| Option | Status |
|--------|--------|
| Uganda LivePay (MTN/Airtel) | **Integrated** — opt-in via env |
| Keep Mbiyo + MoMo + TON | **Continue** — parallel rails |
| Multi-country LivePay expansion | Future — extend checkout body for KES/GHS/XAF |

---

## Related docs

- [USER_FLOW.md](./USER_FLOW.md) — payer checkout
- [PRODUCTION_GO_LIVE.md](./PRODUCTION_GO_LIVE.md) — env and webhooks
- [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) — webhook amount checks
