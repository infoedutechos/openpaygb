# Integration hardening audit

Security posture for external integrators and operators (May 2026).

## Changes applied

### `POST /api/payments` locked down

Previously **unauthenticated** — anyone who knew a `studentId` could create pending payments.

**Now requires:**

- Tuition admin session (`odelhub_admin` cookie from `POST /api/auth/login`), **or**
- Partner API key with scope `payments:create` (`Authorization: Bearer odelhub_live_…`)

Org-scoped API keys cannot create payments for students outside their organization.

### Partner API keys

- Issued only by **master** admins via `/api/master/partner/keys`.
- Stored as SHA-256 hashes; plain key shown once.
- Scopes enforced per route.

### Outbound webhooks

- HMAC-SHA256 signature on raw JSON body (`X-Odelhub-Signature`).
- Endpoints configured in Master Admin; deliveries logged.

### Custom mobile-money providers

- Master-configured inbound webhooks at `/api/webhooks/provider/<code>`.
- Secret required in production (same pattern as MoMo/Mbiyo).

---

## CORS and browser integration

| Route | CORS |
|-------|------|
| `GET /api/manifest/tonconnect` | `Access-Control-Allow-Origin: *` |
| All other `/api/*` | **No** global CORS headers |

**Implication:** A SPA on `https://sis.school.edu` cannot call `https://pay.odelhub.com/api/public/checkout/*` from the browser without a **BFF** (backend-for-frontend) on the school domain.

### Recommended BFF pattern

```
Student browser → school.edu/api/odelhub/* → ODELHUB (server-side, API key or token forward)
```

The BFF should:

- Never expose Partner API keys to the browser.
- Forward `x-checkout-token` only over HTTPS between your UI and BFF.
- Validate `X-Odelhub-Signature` on webhook handlers before updating your database.

### iframe embed

Redirect or iframe `https://<odelhub>/pay/<orgSlug>` — same-origin to ODELHUB, no CORS issues for checkout UI.

---

## Rate limiting

In-memory per serverless instance (`lib/rate-limit.ts`). For high-volume partners:

- Put Vercel Firewall / Upstash in front of webhook URLs.
- Use Partner API from a single egress IP where possible.

---

## Production secrets

Webhook and cron routes return **503** if required env vars are missing in production (`lib/production-secrets.ts`):

- `MOMO_WEBHOOK_SECRET`, `MBIYO_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_SECRET`
- `CRON_SECRET`

Custom providers require `webhookSecret` set in Master Admin before activation.

---

## Remaining risks / roadmap

| Item | Severity | Mitigation |
|------|----------|------------|
| No automatic webhook retry | Medium | Partner should accept idempotent `payment.confirmed`; poll `GET /api/partner/v1/payments/:id` as backup |
| In-memory rate limits | Medium | Edge firewall at scale |
| `GET /api/admin/notifications` unauthenticated | Low | Read-only public announcements |
| Dual admin auth (tuition JWT + URA session) | Low | Document which shell operators use |
| Partner key rotation | Medium | Create new key, migrate, revoke old via Master Admin |

---

## Checklist for go-live

- [ ] `NEXT_PUBLIC_APP_URL` matches production domain
- [ ] Partner API key with minimal scopes
- [ ] Outbound webhook URL is HTTPS; signature verified in SIS
- [ ] MoMo/Mbiyo/custom provider webhooks registered with PSP
- [ ] `POST /api/payments` not exposed publicly without auth
- [ ] SIS uses BFF, not browser-direct cross-origin API calls
