# ODEL HUB Developer Ecosystem

**Last updated:** 2026-09-03 · **Routes:** `/developers`, `/developers/register`, `/developers/dashboard`, `/opgb`

Self-serve onboarding for third-party apps (SIS, fintech, branded OPGB wallets) without manual master steps for each integrator.

**Full commands + logins:** [PLATFORM_UPDATE_2026-09.md](./PLATFORM_UPDATE_2026-09.md) · [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md)  
**Payment provider deep-dive:** [OPENPAYGB_PAYMENT_PROVIDER.md](./OPENPAYGB_PAYMENT_PROVIDER.md) · [PARTNER_API.md](./PARTNER_API.md)

---

## Quick start

```bash
npm run dev
# Open http://localhost:3000/developers/register
```

1. **Register** — UI `/developers/register` or `POST /api/public/ecosystem/register-app`. Save `clientId` + `clientSecret` once.
2. **Sign in** — `POST /api/developers/auth/login` with `clientId` + `clientSecret` (dashboard cookie) or use the register/login UI.
3. **Create API key** — Dashboard → Partner API keys (`odelhub_live_…`) with at least `charges:create` + `charges:read` (add `payouts:*` for cashout).
4. **Configure** — `#fees` (pass-through/absorb, surcharge, payout MoMo), `#branding` (white-label).
5. **Add webhook** — HTTPS endpoint for `charge.confirmed`, `charge.failed`, `payment.confirmed`, etc.
6. **Call APIs** — `POST /api/partner/v1/charges` → redirect to `checkoutUrl`.
7. **Cash out** — Dashboard `#settlement` or `POST /api/partner/v1/payouts`.

There is **no seeded developer app** — every integrator registers their own.

---

## Dashboard sections (`/developers/dashboard`)

| Section | Purpose |
|---------|---------|
| Overview | KPIs — available balance, confirmed charges, OPGB fees |
| Settlement & cashout | Request MoMo cashout from settlement float |
| Transactions | Merchant charge ledger |
| Fees | Who pays OPGB fee; merchant surcharge; payout phone |
| White-label | Name, logo, colors, WL mode (may incur activation + per-charge fee) |
| API keys | Partner Bearer keys |
| Webhooks | Outbound signed events |
| OAuth & OPGB APIs | Endpoint cheat sheet |

---

## OAuth app registry

| Field | Purpose |
|-------|---------|
| `clientId` | Public app identifier (`odelhub_app_…`) |
| `clientSecret` | Dashboard sign-in + token endpoint |
| `redirectUris` | Allowed OAuth redirect URLs (https or localhost) |
| `brandingName` / colors / `whiteLabelMode` | Hosted checkout branding |
| `scopes` | Max scopes for keys issued by this app |

**Authorization code:** `GET /api/oauth/authorize?response_type=code&client_id=…&redirect_uri=…`  
**Token:** `POST /api/oauth/token` with `grant_type=client_credentials` or `authorization_code`.

---

## Partner API scopes

| Scope | Endpoint |
|-------|----------|
| `payments:read` | `GET /api/partner/v1/payments` |
| `payments:create` | Create tuition payments (admin-auth patterns) |
| `organizations:read` | `GET /api/partner/v1/organizations` |
| `charges:create` | `POST /api/partner/v1/charges` |
| `charges:read` | `GET /api/partner/v1/charges`, `GET …/charges/:id` |
| `payouts:create` | `POST /api/partner/v1/payouts` |
| `payouts:read` | `GET /api/partner/v1/payouts` |
| `dex:quote:read` | `GET /api/partner/v1/dex/quote` |
| `dex:intent:create` | `POST /api/partner/v1/dex/payment-intents` |
| `opgb:balance:read` | `GET /api/partner/v1/opgb/balances?studentId=…` |

Default scopes on new apps include charges + payouts (existing apps gain missing defaults on next developer session).

---

## Merchant charge (payment provider)

```http
POST /api/partner/v1/charges
Authorization: Bearer odelhub_live_…
Content-Type: application/json

{
  "amountUgx": 25000,
  "description": "Order #1042",
  "redirectUrl": "https://your-app.example/done",
  "externalRef": "ord_1042"
}
```

- `amountUgx` = **order** amount. Response `amountUgx` = **customer total** after fee rules.
- Hosted page: `/opgb/checkout/{id}`
- Webhooks: `charge.created`, `charge.confirmed`, `charge.failed`
- Sandbox: when LivePay unset (or `OPENPAYGB_CHARGES_SANDBOX=1`)

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

## Master ops

| Surface | URL |
|---------|-----|
| OPGB multi-tab console | `/admin/master/opgb-ops` |
| Merchant fee / WL pricing | Console tab **Fees & white-label** |
| Cashout approve/reject | Console tab **Cashouts & partners** |
| Login | `/admin/login?master=1` · seed `master@odelhub.local` / `ChangeMe_Master123!` |

---

## Knowledge base

- Help hub filter: **OpenPayGB & Dex** at `/help?hub=dex`
- Public guide: `/opgb#integrate`

---

## Related docs

- [PLATFORM_UPDATE_2026-09.md](./PLATFORM_UPDATE_2026-09.md)
- [OPENPAYGB_PAYMENT_PROVIDER.md](./OPENPAYGB_PAYMENT_PROVIDER.md)
- [PARTNER_API.md](./PARTNER_API.md)
- [SIS_INTEGRATION_COOKBOOK.md](./SIS_INTEGRATION_COOKBOOK.md)
- [OPGB_TOKEN_ECOSYSTEM.md](./OPGB_TOKEN_ECOSYSTEM.md)
