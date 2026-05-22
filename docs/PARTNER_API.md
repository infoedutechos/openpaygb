# Partner API (machine-to-machine)

Formal partner surface for SIS, ERP, and treasury systems. Keys are issued from **Master Admin → Partner API**.

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

Org-scoped keys only see data for that `organizationId`. Platform keys (no org) see all active tenants on list endpoints.

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
- [Integration Hardening](./INTEGRATION_HARDENING.md)
- [OpenAPI (tuition subset)](./openapi.yaml)
