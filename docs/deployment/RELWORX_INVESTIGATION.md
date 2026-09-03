# Relworx Payments API v2 — holistic investigation

**Date:** 2026-06-04 · **Sources:** [Relworx docs](https://payments.relworx.com/docs/) (URLs listed below) · **App:** ODEL HUB Pay / OpenPayGB

This document maps the full Relworx v2 surface area and how it relates to ODELHUB-Pay (LivePay, Mbiyo, TON, OpenPayGB card). **Relworx is not integrated in the codebase today.**

---

## 1. Platform overview

| Item | Value |
|------|--------|
| API version | **v2** (default) — `Accept: application/vnd.relworx.v2` |
| Base URL | `https://payments.relworx.com/api` — [API Endpoint](https://payments.relworx.com/docs/api_endpoint/) |
| Auth | Bearer API key — [Authentication](https://payments.relworx.com/docs/authentication/) |
| Tenancy | Dashboard → **business account** → `account_no` per entity |
| Webhooks | Per business account; **HTTP 200** required; **10 retries**, exponential backoff — [Webhooks](https://payments.relworx.com/docs/webhooks/) |

**Supported rails (from [Introduction](https://payments.relworx.com/docs/)):**

| Region | Currency | Methods | Min | Max |
|--------|----------|---------|-----|-----|
| Uganda | UGX | MTN & Airtel MoMo | 500 | 5,000,000 |
| Uganda | UGX | **VISA** | 2,000 | 5,000,000 |
| Kenya | KES | Safaricom & Airtel MoMo | 10 | 70,000 |
| Tanzania | TZS | Airtel, Tigo, Vodacom, Halotel | 500 | 5,000,000 |
| Rwanda | RWF | MTN & Airtel MoMo | 100 | 5,000,000 |
| DRC | CDF / USD | Multiple MoMo wallets | varies | varies |
| Global | USD | VISA (**disabled** in table) | 12 | 5,000 |

MoMo collect/send docs state **UGX, KES, TZS** only (no FX; currency must match MSISDN).

---

## 2. HTTP errors

[Error handling](https://payments.relworx.com/docs/error_handling/) · [Common codes](https://payments.relworx.com/docs/error_handling/common_error_codes/)

| Code | Meaning |
|------|---------|
| 200 | OK |
| 400 | Bad request / missing params |
| 401 | Missing or expired token |
| 403 | Access denied (wrong account, IP, etc.) |
| 404 | Resource not found |
| 422 | Params present but invalid |
| 500 | Server error — retry |
| 503 | Maintenance |

**FAQs** ([category](https://payments.relworx.com/docs/category/faqs/)) mention:

- `Can't transact in UGX` — contact support to enable UGX.
- `API key not authorized to access this business account` — key/account mismatch.
- **`No Authorized IP Access / Invalid access for IP`** — IP allowlist required in dashboard (same class of issue as LivePay IP blocks in local dev).

---

## 3. Mobile money API

[Index](https://payments.relworx.com/docs/category/mobile-money/)

### 3.1 Request payment (collect)

[Request payment](https://payments.relworx.com/docs/mobile_money/request_payment/)

```
POST https://payments.relworx.com/api/mobile-money/request-payment
```

| Field | Required | Notes |
|-------|----------|-------|
| `account_no` | Yes | Business account |
| `reference` | Yes | **8–36** chars, your idempotency key |
| `msisdn` | Yes | E.164 e.g. `+256701345678` |
| `currency` | Yes | `UGX` \| `KES` \| `TZS` |
| `amount` | Yes | Decimal |
| `description` | No | |

**Rate limit:** **5 requests per 10 minutes per `msisdn`** — critical for checkout retry UX.

**Response:** `{ success, message, internal_reference }`

### 3.2 Send payment (payout)

[Send payment](https://payments.relworx.com/docs/mobile_money/send_payment/)

```
POST https://payments.relworx.com/api/mobile-money/send-payment
```

Same fields as collect; credits recipient wallet. Use for refunds, bursaries, merchant cash-out (not tuition collect).

### 3.3 Validate MSISDN

[Validate](https://payments.relworx.com/docs/mobile_money/validate_mobile_number/)

```
POST https://payments.relworx.com/api/mobile-money/validate
```

Body: `{ msisdn }`. Returns `customer_name`. **Docs: only Airtel & MTN Uganda** for validation currently.

### 3.4 Wallet balance

[Check wallet balance](https://payments.relworx.com/docs/mobile_money/check_wallet_balance/)

```
GET https://payments.relworx.com/api/mobile-money/check-wallet-balance?account_no=...&currency=UGX
```

Returns Relworx **merchant** MoMo float (`balance`), not student balance.

### 3.5 Check request status

[Check request status](https://payments.relworx.com/docs/mobile_money/check_request_status/)

```
GET https://payments.relworx.com/api/mobile-money/check-request-status?internal_reference=...&account_no=...
```

Returns full transaction: `status`, `request_status`, `customer_reference`, `internal_reference`, `msisdn`, `amount`, `currency`, `provider` (e.g. `AIRTEL_UGANDA`), `charge`, `provider_transaction_id`, `completed_at`.

**ODELHUB parallel:** LivePay status poll on `GET /api/payments/:id/public` when `rail === livepay`.

### 3.6 Transaction history (MoMo)

[Transaction history](https://payments.relworx.com/docs/mobile_money/transaction_history/)

```
GET https://payments.relworx.com/api/payment-requests/transactions?account_no=...
```

Last **30 days**, max **1000** rows. Types include `collection` / statuses `pending` \| `failed` \| `success`.

---

## 4. Visa / Mastercard

### 4.1 Request payment session

[Request payment session](https://payments.relworx.com/docs/visa_or_mastercard/request_payment_session/)

```
POST https://payments.relworx.com/api/visa/request-session
```

| Field | Required | Notes |
|-------|----------|-------|
| `account_no`, `reference` (8–36), `currency`, `amount` | Yes | `currency`: **UGX** or **USD** |
| `description` | No | |

**Response:** `{ success, message, payment_url }` — load `payment_url` in browser (hosted card form).

**ODELHUB:** No card-acquiring rail today; this is **not** the OpenPayGB closed-loop virtual card.

### 4.2 Auto return

[Auto return](https://payments.relworx.com/docs/visa_or_mastercard/auto_return/)

- Configured per business account in dashboard.
- After card payment, Relworx **POSTs** to your return URL with `status`, `customer_reference`, `internal_reference`, plus `relworx_signature`.
- Signature algorithm matches webhooks (URL + timestamp + sorted `status`, `customer_reference`, `internal_reference` → HMAC-SHA256).

---

## 5. Bill payments / “Products” API

Separate catalog for **airtime, data, TV, utilities** (NWSC, UMEME/Yaka, DSTV, etc.) — not tuition.

| Step | Endpoint | Doc |
|------|----------|-----|
| List | `GET /api/products` | [Available products](https://payments.relworx.com/docs/products/available_products/) |
| Prices | `GET /api/products/price-list?code=` | [Price list](https://payments.relworx.com/docs/products/price_list/) |
| Choices | `GET /api/products/choice-list?code=` | [Choice list](https://payments.relworx.com/docs/products/choice_list/) |
| Validate | `POST /api/products/validate` | [Validate product](https://payments.relworx.com/docs/products/validate_product/) |
| Buy | `POST /api/products/purchase` | [Purchase product](https://payments.relworx.com/docs/products/purchase_product/) |

**Purchase debits your business account UGX MoMo wallet** (not payer card/MoMo in one step). Flow: validate → `validation_reference` → purchase → `internal_reference`.

**Relevance to ODELHUB:** Low for core tuition; possible future “pay utilities” add-on only.

---

## 6. Webhooks & security

### 6.1 Payload (MoMo)

[Webhooks](https://payments.relworx.com/docs/webhooks/)

```json
{
  "status": "success",
  "message": "Request payment completed successfully.",
  "customer_reference": "kemist656ehgvcd",
  "internal_reference": "fdd10a4c5d6b459d54ebc5f09d095101",
  "msisdn": "+256773454899",
  "amount": 500.0,
  "currency": "UGX",
  "provider": "mtn_mobile_money",
  "charge": 12.5,
  "completed_at": "2025-04-10T15:12:58.977+03:00"
}
```

Map `customer_reference` → your `Payment.id` (or dedicated reference). Confirm ledger on `status === success`.

### 6.2 Signature verification

[Authenticate webhook requests](https://payments.relworx.com/docs/webhooks/authenticate_webhook_requests/)

- Header: **`Relworx-Signature`**: `t=<unix>,v=<hex>`
- Signed string: **exact webhook URL** (including query string) + **timestamp** + sorted POST fields **`status`**, **`customer_reference`**, **`internal_reference`** (keys concatenated with values, no delimiter).
- HMAC-SHA256 with **webhook authentication key** (per business account; rotatable in dashboard).
- Reject stale `t` for replay protection.

### 6.3 LivePay similarity (ODELHUB today)

LivePay webhook signing (`lib/livepay/verify-webhook-signature.ts`):

- Header: `X-Webhook-Signature` with `t=...,v=...`
- String: `webhookUrl + timestamp + status + customer_reference + internal_reference` (**fixed order**, not sorted)

Relworx uses **sorted** POST keys; LivePay uses **fixed field order**. Payload shape (`customer_reference`, `internal_reference`, `status`) is nearly identical. Treat as **integration-pattern reuse**, not proof of same vendor—verify contractually before swapping credentials.

---

## 7. Unified transactions API

[Mobile money & VISA transactions](https://payments.relworx.com/docs/Transactions/mobilemoney_visa/)

Same endpoint as §3.6: `GET /api/payment-requests/transactions?account_no=...` — includes **MoMo + Visa** collections/payouts (`transaction_type`: `collection` \| `payout`, `provider`: `Visa Mastercard`, etc.). Reconciliation / ops dashboard use.

---

## 8. ODELHUB-Pay mapping

```mermaid
flowchart TB
  subgraph odel [ODELHUB today]
    PW[PayWizard / StudentTuitionFlow]
    TON[TON Connect]
    MB[Mbiyo rail]
    LP[LivePay rail]
    WH_LP[/api/webhooks/livepay]
    POLL[GET /api/payments/:id/public]
    CARD[OpenPayGB closed-loop card]
  end
  subgraph rw [Relworx v2 - not built]
    RW_C[POST request-payment]
    RW_V[POST visa/request-session]
    RW_WH[Webhook + Relworx-Signature]
    RW_ST[GET check-request-status]
  end
  PW --> TON
  PW --> MB
  PW --> LP --> WH_LP
  PW --> POLL
  PW --> CARD
  PW -.optional.- RW_C
  RW_C --> RW_WH
  RW_ST --> POLL
```

| Capability | Relworx | ODELHUB |
|------------|---------|---------|
| UG MTN/Airtel collect | `request-payment` | **LivePay** `livepay-start` |
| East Africa MoMo | UG/KE/TZ (+ table: RW, CD) | **Mbiyo** (broader checkout) |
| Card at checkout | `visa/request-session` + hosted URL | **None** |
| Payout to phone | `send-payment` | Not first-class |
| MSISDN name lookup | `validate` (UG MTN/Airtel) | Not used |
| Status poll | `check-request-status` | LivePay sync on public payment route |
| Webhook HMAC | `Relworx-Signature` + sorted fields | `X-Webhook-Signature` + fixed order |
| Bill pay (Yaka, DSTV…) | Products API | Out of scope |
| Platform virtual card | N/A | **OpenPayGB** ledger + TON |

---

## 9. Integration blueprint (if approved)

### 9.1 Environment

```env
RELWORX_API_KEY=
RELWORX_ACCOUNT_NO=
RELWORX_WEBHOOK_KEY=
RELWORX_WEBHOOK_URL=https://your-app/api/webhooks/relworx
```

### 9.2 Schema

```prisma
enum PaymentRail {
  // ...
  relworx
}
```

Store `internal_reference` on `Payment.momoReference` or new field; `customer_reference` = payment id (8–36 chars — pad/hash if needed).

### 9.3 Routes (mirror LivePay)

| Route | Action |
|-------|--------|
| `POST /api/public/checkout/relworx-start` | Create pending payment → `request-payment` |
| `POST /api/webhooks/relworx` | Verify `Relworx-Signature` → confirm payment |
| Extend `GET /api/payments/:id/public` | If pending + `relworx`, call `check-request-status` (rate-limited) |

### 9.4 Reference constraints

- Mongo payment `id` is 24 hex — valid as Relworx `reference` (8–36).
- LivePay caps reference at **30** chars; Relworx allows **36** — minor difference.

### 9.5 UX guardrails

- Surface vendor **5 collects / 10 min / MSISDN** on retry buttons.
- Map **403 IP** errors like LivePay (`livePayUserMessage` pattern).
- Do not poll public status faster than Relworx + your own rate limits (see payment-public poll fix).

### 9.6 Visa tuition (optional phase 2)

1. `POST /visa/request-session` with tuition `totalUgx`.
2. Redirect student to `payment_url`.
3. Confirm via webhook + auto-return POST (same signature as webhooks).
4. New checkout step: “Pay with Visa”.

---

## 10. When to adopt / avoid

| Adopt Relworx when… | Avoid / defer when… |
|---------------------|---------------------|
| LivePay IP/cost/support is blocking | LivePay works and contract is stable |
| Need **one API** for UG+KE+TZ MoMo | Only Uganda; duplicate ops burden |
| Need **Visa** checkout in UGX | TON + MoMo enough |
| Need **send-payment** payouts | Only collecting tuition |
| Want **products** (utilities/airtime) | Focus is tuition only |

**Do not** use Relworx for **OpenPayGB platform virtual card** (closed-loop ledger) — see `docs/platform/VIRTUAL_CARD_INVESTIGATION.md`.

---

## 11. Doc index (requested URLs)

| URL | Topic |
|-----|--------|
| https://payments.relworx.com/docs/ | Introduction, limits, onboarding |
| https://payments.relworx.com/docs/api_endpoint/ | Base URL |
| https://payments.relworx.com/docs/error_handling/ | HTTP semantics |
| https://payments.relworx.com/docs/error_handling/common_error_codes/ | Status code table |
| https://payments.relworx.com/docs/authentication/ | Bearer API key |
| https://payments.relworx.com/docs/category/mobile-money/ | MoMo index |
| https://payments.relworx.com/docs/mobile_money/request_payment/ | Collect |
| https://payments.relworx.com/docs/mobile_money/send_payment/ | Payout |
| https://payments.relworx.com/docs/mobile_money/validate_mobile_number/ | MSISDN validate |
| https://payments.relworx.com/docs/mobile_money/check_wallet_balance/ | Merchant float |
| https://payments.relworx.com/docs/mobile_money/check_request_status/ | Status poll |
| https://payments.relworx.com/docs/mobile_money/transaction_history/ | History |
| https://payments.relworx.com/docs/visa_or_mastercard/request_payment_session/ | Card session |
| https://payments.relworx.com/docs/visa_or_mastercard/auto_return/ | Card return POST |
| https://payments.relworx.com/docs/products/* | Bill pay catalog |
| https://payments.relworx.com/docs/webhooks/ | Webhook payload |
| https://payments.relworx.com/docs/webhooks/authenticate_webhook_requests/ | HMAC verification |
| https://payments.relworx.com/docs/Transactions/mobilemoney_visa/ | Combined txn list |
| https://payments.relworx.com/docs/category/faqs/ | IP allowlist, UGX enable, plugins |

---

## 12. Recommendation for ODELHUB

1. **Short term:** Keep **LivePay** for Uganda MoMo; complete OpenPayGB card + fix poll/rate limits (done).
2. **Pilot Relworx** only with sandbox keys if evaluating: (a) LivePay replacement, (b) Kenya/Tanzania schools, or (c) Visa checkout.
3. **Implementation order:** MoMo collect + webhook + status poll → production IP allowlist → optional Visa → ignore Products unless new product line.

## 13. Implementation status (ODELHUB-Pay)

**Implemented** (2026-06-04):

| Piece | Path |
|-------|------|
| Client + collect | `lib/relworx/client.ts` |
| Confirm + status poll | `lib/relworx/confirm-payment.ts`, `lib/relworx/request-status.ts` |
| Webhook HMAC | `lib/relworx/verify-webhook-signature.ts` |
| Checkout start | `POST /api/public/checkout/relworx-start` |
| Public config | `GET /api/public/relworx-config` |
| Webhook | `POST /api/webhooks/relworx` |
| Poll sync | `GET /api/payments/:id/public` when `rail === relworx` |
| UI | `PayWizard`, `StudentTuitionFlow` |
| Prisma | `PaymentRail.relworx` |

Run `npm run db:push` after pulling. Configure env per `docs/platform/LOCAL_DEV_AND_CREDENTIALS.md`.
