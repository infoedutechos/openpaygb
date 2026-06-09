# User Guide: Partner Integrator (SIS / ERP / Finance Systems)

## Scope

This guide explains how to integrate with ODEL HUB Pay partner APIs and outbound webhooks using the patterns in `docs/PARTNER_API.md`.

Integration surfaces:

- Partner read APIs under `/api/partner/v1/*`
- Partner key management by master admin in `/admin/master#partner-integrations`
- Outbound signed webhook events (for example `payment.confirmed`)

## 1) Obtain API credentials

Platform master actions:

1. Open `/admin/master`.
2. Go to Partner API section.
3. Create key (name, scope, optional organization binding).
4. Copy secret immediately (plaintext shown once).

Accepted auth headers:

```http
Authorization: Bearer odelhub_live_<secret>
```

or

```http
X-Api-Key: odelhub_live_<secret>
```

## 2) Understand key scoping

| Scope | Purpose |
|---|---|
| `payments:read` | Read payments list/detail |
| `organizations:read` | Read active organizations |
| `payments:create` | Future/extended create patterns (platform-dependent) |
| `students:read` | Reserved/future |

Data visibility:

- Org-scoped key -> only that organization data.
- Platform key (no org binding) -> cross-tenant access where endpoint allows it.

## 3) Call partner APIs

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

## 4) Typical payment object fields

Expect fields similar to:

- `id`
- `organizationId`, `organizationSlug`
- `studentId`
- `programmeCode`, `year`, `semester`
- `totalUgx`, `tonAmount`
- `rail`, `status`
- `confirmedAt`, `createdAt`

Use `status = confirmed` for downstream posting to SIS/finance ledgers.

## 5) Configure outbound webhooks

Master admin configures webhook endpoints at:

- `/api/master/partner/webhooks`

Each endpoint includes:

- destination URL,
- event list,
- shared signing secret,
- enable/disable toggle.

Current primary event:

- `payment.confirmed`

## 6) Verify webhook signatures

Webhook request pattern:

- Header `X-Odelhub-Event: payment.confirmed`
- Header `X-Odelhub-Signature: <hex hmac sha256 raw body>`
- JSON payload with event metadata and payment summary

Verification (Node example):

```js
const crypto = require("crypto");
function verify(secret, rawBody, signatureHex) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signatureHex, "hex"));
}
```

Integration rule:

- Reject unsigned or mismatched events.
- Use idempotency keyed by event id/payment id to avoid duplicate processing.

## 7) Recommended integration workflow

1. Create sandbox/test key.
2. Pull organizations and map target school slug(s).
3. Pull confirmed payments in a backfill window.
4. Store last-processed timestamp + payment id checkpoint.
5. Configure webhook endpoint for near-real-time updates.
6. On webhook failure, replay from API using `since` filters.

## 8) Error handling model

Handle these classes cleanly:

- `401/403` -> invalid key, disabled key, insufficient scope.
- `404` -> payment id not visible in key scope.
- `429` -> retry with exponential backoff.
- `5xx` -> retry with jitter and dead-letter fallback.

## 9) Security requirements

- Store keys and webhook secrets in a secure vault.
- Rotate keys periodically and on personnel changes.
- Enforce HTTPS for webhook endpoint.
- Limit inbound webhook IP/rate where possible.
- Log signature verification failures and alert on spikes.

## 10) Operational troubleshooting

| Issue | Diagnosis | Resolution |
|---|---|---|
| 401 unauthorized | Wrong/expired key or formatting error | Regenerate key, verify `Bearer` format |
| Empty payments list | Org-scoped key on wrong org or filters too strict | Validate key org binding and query window |
| Webhook not received | Endpoint disabled/unreachable | Check partner webhook settings and destination health |
| Signature mismatch | Using parsed JSON instead of raw body | Verify against raw request body bytes |
| Duplicate events | Retry behavior or delivery retries | Implement idempotency on event id/payment id |

## 11) Integration checklist

- [ ] Key created with least-privilege scope.
- [ ] Secure secret storage configured.
- [ ] API polling and pagination implemented.
- [ ] Webhook endpoint online and signature-verified.
- [ ] Idempotency and replay strategy implemented.
- [ ] Monitoring/alerts for 401, 429, 5xx, and webhook signature failures.

## Reference documents

- `docs/PARTNER_API.md`
- `docs/SIS_INTEGRATION_COOKBOOK.md`
- `docs/INTEGRATION_HARDENING.md`
