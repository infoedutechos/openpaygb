# Partner API (machine-to-machine)

**Last updated:** 2026-09-03

Formal partner surface for SIS, ERP, treasury systems, and **OpenPayGB merchant charges**. Keys are issued from the **Developer dashboard** (`/developers/dashboard`) or **Master → OPGB console / Partner API**.

**Commands + logins:** [PLATFORM_UPDATE_2026-09.md](./PLATFORM_UPDATE_2026-09.md) · [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md)  
**Provider guide:** [OPENPAYGB_PAYMENT_PROVIDER.md](./OPENPAYGB_PAYMENT_PROVIDER.md)

## Authentication

Send the API key on every request:

```http
Authorization: Bearer odelhub_live_<secret>
```

Or:

```http
X-Api-Key: odelhub_live_<secret>
```

Keys are stored as SHA-256 hashes; the plain value is shown **once** at creation.

## Scopes

| Scope | Access |
|-------|--------|
| `payments:read` | `GET /api/partner/v1/payments`, `GET /api/partner/v1/payments/:id` |
| `payments:create` | `POST /api/payments` (same body as admin; requires auth) |
| `organizations:read` | `GET /api/partner/v1/organizations` |
| `students:read` | Reserved for future endpoints |
| `charges:create` | `POST /api/partner/v1/charges` — create merchant/hosted checkout charges |
| `charges:read` | `GET /api/partner/v1/charges`, `GET /api/partner/v1/charges/:id` |
| `payouts:create` | `POST /api/partner/v1/payouts` — request merchant MoMo cashout |
| `payouts:read` | `GET /api/partner/v1/payouts` — settlement summary + payout history |
| `dex:quote:read` | Dex quote endpoints |
| `dex:intent:create` | Dex payment intents |
| `opgb:balance:read` | OPGB wallet balances |

Org-scoped keys only see data for that `organizationId`. Platform keys (no org) see all active tenants on list endpoints. Merchant **charges** require the API key to be linked to a **Developer App**.

## Merchant charges (payment provider)

Use OpenPayGB as a payment gateway for third-party products (not tuition-bound).

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

**201**

```json
{
  "charge": {
    "id": "…",
    "orderAmountUgx": 25000,
    "amountUgx": 25625,
    "platformFeeUgx": 625,
    "merchantFeeUgx": 0,
    "merchantNetUgx": 25000,
    "status": "pending",
    "checkoutUrl": "http://localhost:3000/opgb/checkout/…",
    "expiresAt": "…"
  }
}
```

`amountUgx` on create is the **order**; response `amountUgx` is the **customer total** after fee rules. Fee payer and surcharges are configured on the Developer App (`/developers/dashboard#fees`).

1. Redirect the payer to `checkoutUrl`.
2. Payer pays with MTN/Airtel MoMo (or sandbox confirm in local/dev when LivePay is unset).
3. Receive webhook `charge.confirmed` (also `charge.created`, `charge.failed`). Confirmed charges credit `merchantNetUgx` to settlement balance.

### Merchant payouts (cashout)

```http
GET /api/partner/v1/payouts
Authorization: Bearer odelhub_live_…
```

```http
POST /api/partner/v1/payouts
Authorization: Bearer odelhub_live_…
Content-Type: application/json

{ "amountUgx": 10000, "note": "Weekly float" }
```

Requires a payout MoMo number on the developer app. Minimum 1,000 UGX. Hosted page: `/opgb/checkout/{id}` · Provider lobby: `/opgb` · Dashboard: `/developers/dashboard`

## Endpoints

### List payments

```http
GET /api/partner/v1/payments?status=confirmed&since=2026-05-01T00:00:00Z&limit=50
Authorization: Bearer odelhub_live_…
```

**200**

```json
{
  "payments": [
    {
      "id": "665f1a2b3c4d5e6f7a8b9c0d",
      "organizationId": "665f00000000000000000001",
      "organizationSlug": "kampala-campus",
      "studentId": "665f10000000000000000002",
      "programmeCode": "BSC-CS",
      "year": 1,
      "semester": 1,
      "totalUgx": 1250000,
      "tonAmount": 12.45,
      "rail": "mbiyo",
      "status": "confirmed",
      "memo": "",
      "confirmedAt": "2026-05-18T10:22:00.000Z",
      "createdAt": "2026-05-18T10:15:00.000Z"
    }
  ]
}
```

### Get payment

```http
GET /api/partner/v1/payments/665f1a2b3c4d5e6f7a8b9c0d
```

### List organizations

```http
GET /api/partner/v1/organizations
```

## Outbound webhooks (payment events)

Configure HTTPS endpoints in **Master Admin → Partner API → Outbound webhooks**.

When a payment is first confirmed, ODELHUB POSTs:

```http
POST https://your-sis.example/webhooks/odelhub
Content-Type: application/json
X-Odelhub-Event: payment.confirmed
X-Odelhub-Signature: <hex hmac-sha256 of raw body>
```

**Body**

```json
{
  "id": "evt_1716124920000",
  "type": "payment.confirmed",
  "createdAt": "2026-05-18T10:22:00.123Z",
  "data": {
    "payment": {
      "id": "665f1a2b3c4d5e6f7a8b9c0d",
      "organizationSlug": "kampala-campus",
      "totalUgx": 1250000,
      "status": "confirmed"
    }
  }
}
```

**Verify signature (Node.js)**

```js
const crypto = require("crypto");
function verify(secret, rawBody, signatureHex) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signatureHex, "hex"));
}
```

Deliveries are logged for 7 days in `partner_webhook_deliveries`. Failures are logged only (no automatic retry yet).

## Mobile money (inbound)

Custom PSPs: register `https://<domain>/api/webhooks/provider/<code>` (see Master Admin → Mobile money).

Built-in: `/api/webhooks/momo`, `/api/webhooks/mbiyo`.

## Related docs

- [SIS Integration Cookbook](./SIS_INTEGRATION_COOKBOOK.md)
- [Integration Hardening](../operations/INTEGRATION_HARDENING.md)
- [OpenAPI (tuition subset)](../api-reference/openapi.yaml)
