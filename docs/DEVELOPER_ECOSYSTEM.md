# ODEL HUB Developer Ecosystem

**Date:** 2026-06-03 · **Routes:** `/developers`, `/developers/register`, `/developers/dashboard`

Self-serve onboarding for third-party apps (SIS, fintech, branded OPGB wallets) without manual master steps for each integrator.

---

## Quick start

1. **Register** — `POST /api/public/ecosystem/register-app` or UI at `/developers/register`.
2. **Sign in** — `POST /api/developers/auth/login` with `clientId` + `clientSecret` (dashboard cookie).
3. **Create API key** — Developer dashboard → Partner API keys (`odelhub_live_…`).
4. **Add webhook** — HTTPS endpoint for `payment.confirmed`, `dex.intent.created`, etc.
5. **Call APIs** — Partner read/write under `/api/partner/v1/*`.

---

## OAuth app registry

| Field | Purpose |
|-------|---------|
| `clientId` | Public app identifier (`odelhub_app_…`) |
| `clientSecret` | Dashboard sign-in + token endpoint |
| `redirectUris` | Allowed OAuth redirect URLs (https or localhost) |
| `brandingName` | Third-party OPGB app display name |
| `scopes` | Max scopes for keys issued by this app |

**Authorization code:** `GET /api/oauth/authorize?response_type=code&client_id=…&redirect_uri=…`

**Token:** `POST /api/oauth/token` with `grant_type=client_credentials` or `authorization_code`.

---

## Partner API scopes

| Scope | Endpoint |
|-------|----------|
| `payments:read` | `GET /api/partner/v1/payments` |
| `organizations:read` | `GET /api/partner/v1/organizations` |
| `dex:quote:read` | `GET /api/partner/v1/dex/quote` |
| `dex:intent:create` | `POST /api/partner/v1/dex/payment-intents` |
| `opgb:balance:read` | `GET /api/partner/v1/opgb/balances?studentId=…` |

---

## Dex payment intents (write API)

```http
POST /api/partner/v1/dex/payment-intents
Authorization: Bearer odelhub_live_…
Content-Type: application/json

{
  "type": "buy",
  "crypto": "TON",
  "fiatAmountUgx": 100000,
  "redirectUrl": "https://your-app.com/done"
}
```

Response includes `executeUrl` for hosted Dex UI (`/dex/buy?intent=…`).

---

## Knowledge base

- Help hub filter: **OpenPayGB & Dex** at `/help?hub=dex`
- Seed articles: `integrate-odel-hub`, `partner-api-overview`, `opgb-dex-partner-api`, `oauth-app-registry`

---

## Related docs

- [PARTNER_API.md](./PARTNER_API.md)
- [SIS_INTEGRATION_COOKBOOK.md](./SIS_INTEGRATION_COOKBOOK.md)
- [OPGB_TOKEN_ECOSYSTEM.md](./OPGB_TOKEN_ECOSYSTEM.md)
