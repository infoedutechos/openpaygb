# User Guide: Partner Integrator (SIS / ERP / Finance Systems)

**Last updated:** 2026-09-03

## Scope

Integrate with ODEL HUB Pay / OpenPayGB using Partner APIs and signed webhooks.

Surfaces:

- Partner APIs under `/api/partner/v1/*`
- Self-serve apps at `/developers/register` → `/developers/dashboard`
- Provider lobby `/opgb`
- Master keys/webhooks/cashouts at `/admin/master/opgb-ops` or `#partner-integrations`

**Commands + logins:** [PLATFORM_UPDATE_2026-09.md](../platform/PLATFORM_UPDATE_2026-09.md) · [LOCAL_DEV_AND_CREDENTIALS.md](../platform/LOCAL_DEV_AND_CREDENTIALS.md)  
**API reference:** [PARTNER_API.md](../platform/PARTNER_API.md) · [OPENPAYGB_PAYMENT_PROVIDER.md](../platform/OPENPAYGB_PAYMENT_PROVIDER.md) · [DEVELOPER_ECOSYSTEM.md](../platform/DEVELOPER_ECOSYSTEM.md)

---

## 0) Local demo commands

```bash
npm run db:push
npm run seed          # master login for ops console
npm run dev
# Browser: http://localhost:3000/developers/register
```

| Role | URL | Credentials |
|------|-----|-------------|
| Your app | `/developers/register` | `clientId` + `clientSecret` (shown once) |
| Master | `/admin/login?master=1` | seed `master@odelhub.local` / `ChangeMe_Master123!` |

---

## 1) Obtain API credentials (preferred: developer dashboard)

1. Open `/developers/register` and create an app.
2. Sign in to `/developers/dashboard`.
3. Create a Partner API key with scopes you need (at least `charges:create` + `charges:read` for accepting payments; add `payouts:*` for cashout).
4. Copy `odelhub_live_…` immediately.

Alternate: Master creates a platform/org key at `/admin/master/opgb-ops` → **Cashouts & partners**. Merchant **charges** require the key linked to a **Developer App**.

Accepted auth headers:

```http
Authorization: Bearer odelhub_live_<secret>
```

or

```http
X-Api-Key: odelhub_live_<secret>
```

---

## 2) Understand key scoping

| Scope | Purpose |
|---|---|
| `payments:read` | Read tuition payments list/detail |
| `organizations:read` | Read active organizations |
| `payments:create` | Extended create patterns (platform-dependent) |
| `students:read` | Reserved/future |
| `charges:create` | Create merchant hosted-checkout charges |
| `charges:read` | List/get merchant charges |
| `payouts:create` | Request merchant MoMo cashout |
| `payouts:read` | Settlement summary + payout history |
| `dex:quote:read` | Dex quotes |
| `dex:intent:create` | Dex payment intents |
| `opgb:balance:read` | OPGB wallet balances |

---

## 3) Accept payments (OpenPayGB payment provider)

```http
POST /api/partner/v1/charges
Authorization: Bearer odelhub_live_…
Content-Type: application/json

{
  "amountUgx": 25000,
  "description": "Order #1042",
  "redirectUrl": "https://your-app.example/orders/1042/paid",
  "cancelUrl": "https://your-app.example/orders/1042",
  "externalRef": "ord_1042",
  "metadata": { "sku": "PRO-1" }
}
```

1. Redirect payer to `charge.checkoutUrl` (`/opgb/checkout/{id}`).
2. Configure fees/branding on `/developers/dashboard#fees` and `#branding`.
3. On confirm, `merchantNetUgx` credits settlement; listen for `charge.confirmed`.
4. Cash out via dashboard or `POST /api/partner/v1/payouts`.

Sandbox: when `LIVEPAY_API_KEY` is unset in non-production (or `OPENPAYGB_CHARGES_SANDBOX=1`), checkout shows **Sandbox: mark as paid**.

---

## 4) Call tuition partner APIs

### List payments

```http
GET /api/partner/v1/payments?status=confirmed&since=2026-05-01T00:00:00Z&limit=50
Authorization: Bearer odelhub_live_...
```

### Get payment by id

```http
GET /api/partner/v1/payments/{paymentId}
Authorization: Bearer odelhub_live_...
```

### List organizations

```http
GET /api/partner/v1/organizations
Authorization: Bearer odelhub_live_...
```

---

## 5) Configure outbound webhooks

Developer dashboard **Webhooks** or Master partner section.

Events include:

- `payment.confirmed` / `payment.failed`
- `charge.created` / `charge.confirmed` / `charge.failed`

Headers:

- `X-Odelhub-Event`
- `X-Odelhub-Signature` (HMAC-SHA256 hex of raw body)

```js
const crypto = require("crypto");
function verify(secret, rawBody, signatureHex) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signatureHex, "hex"));
}
```

---

## 6) Recommended workflow

1. Register developer app; create key with least privilege.
2. Set fee payer + payout MoMo number.
3. Create a sandbox charge; confirm; verify webhook + settlement credit.
4. Request a small cashout; master marks paid in OPGB console.
5. Enable white-label only after reviewing activation + per-charge WL fees.

---

## 7) Error handling

| Code | Meaning |
|------|---------|
| 401/403 | Invalid key, disabled, or missing scope |
| 404 | Id not in key/app scope |
| 429 | Back off |
| 5xx | Retry with jitter |

---

## 8) Checklist

- [ ] App registered; client secret stored securely
- [ ] Key scopes include charges (and payouts if needed)
- [ ] Webhook signature verification + idempotency
- [ ] Fee/branding settings reviewed
- [ ] Sandbox charge → confirm → settlement → cashout tested

## Reference documents

- [PARTNER_API.md](../platform/PARTNER_API.md)
- [OPENPAYGB_PAYMENT_PROVIDER.md](../platform/OPENPAYGB_PAYMENT_PROVIDER.md)
- [DEVELOPER_ECOSYSTEM.md](../platform/DEVELOPER_ECOSYSTEM.md)
- [PLATFORM_UPDATE_2026-09.md](../platform/PLATFORM_UPDATE_2026-09.md)
- [SIS_INTEGRATION_COOKBOOK.md](../platform/SIS_INTEGRATION_COOKBOOK.md)
- [INTEGRATION_HARDENING.md](../operations/INTEGRATION_HARDENING.md)
