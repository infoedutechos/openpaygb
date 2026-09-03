# OpenPayGB as a payment provider

Use **OpenPayGB** (`/opgb`) so other products can collect money without building their own gateway.

## Commands & local demo

```bash
npm run db:push
npm run seed          # optional — master login for fee console
npm run dev
# Register at /developers/register — no seeded merchant app
```

| Who | URL | Credentials |
|-----|-----|-------------|
| Merchant developer | `/developers/register` → `/developers/dashboard` | `clientId` + `clientSecret` from registration |
| Master (fees / cashouts / console) | `/admin/login?master=1` → `/admin/master/opgb-ops` | `master@odelhub.local` / `ChangeMe_Master123!` (seed) |
| Public lobby | `/opgb` | none |

Full matrix: [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md) · [PLATFORM_UPDATE_2026-09.md](./PLATFORM_UPDATE_2026-09.md)

## Surfaces

| URL | Role |
|-----|------|
| `/opgb` | Provider lobby + integration overview (always reachable; not blocked by Dex hub hide) |
| `/opgb/checkout/{id}` | Hosted checkout for a merchant charge (supports white-label branding) |
| `/developers/dashboard` | Transactions, settlement/cashout, fees, white-label, API keys, webhooks |
| `POST /api/partner/v1/charges` | Create a charge (`charges:create`) — `amountUgx` is the **order** amount before fees |
| `GET /api/partner/v1/charges` | List charges (`charges:read`) |
| `GET /api/partner/v1/charges/{id}` | Fetch one charge |
| `GET\|POST /api/partner/v1/payouts` | Settlement summary + request MoMo cashout (`payouts:read` / `payouts:create`) |
| `GET /api/public/charges/{id}` | Public charge + merchant branding for the hosted page |
| `POST /api/public/charges/{id}/livepay-start` | Start MTN/Airtel MoMo collect (customer total) |
| `POST /api/public/charges/{id}/sandbox-confirm` | Local/dev confirm when LivePay is unset |

## Flow

1. Register a developer app → create a Partner API key with `charges:create` + `charges:read` (add `payouts:*` for cashout).
2. Configure fees and branding on `/developers/dashboard`.
3. `POST /api/partner/v1/charges` with `amountUgx` (order), `description`, `redirectUrl`, optional `externalRef`.
4. Redirect the customer to `charge.checkoutUrl`. Customer total may include OPGB fee and/or your surcharge.
5. On confirm, **merchant net** is credited to your settlement balance; OPGB keeps the platform fee.
6. Request cashout when you want MoMo sent to your float number.
7. Listen for webhooks: `charge.created`, `charge.confirmed`, `charge.failed` (`X-Odelhub-Signature` HMAC).

## Who sets fees

| Actor | Controls |
|-------|----------|
| **OpenPayGB (platform)** | Default platform fee via `SiteUiSettings` (`merchantChargePlatformFee*` — default **2.5%**, min **500 UGX**). Per-app override: inherit / percent / fixed / none. |
| **Merchant (your app)** | `platformFeePayer`: `pass_through` (customer pays OPGB fee) or `absorb` (deducted from your net). Optional `merchantSurchargePercent` / `merchantSurchargeFixedUgx`. |

**Pass-through example:** order 25,000 → OPGB fee 625 → customer pays 25,625 → you receive 25,000 (plus any surcharge).

**Absorb example:** order 25,000 → OPGB fee 625 → customer pays 25,000 → you receive 24,375.

## Cashout (how OPGB benefits)

- OPGB earns the **platform fee** on each confirmed charge.
- Merchants earn **merchant net**, held as `settlementBalanceUgx` until cashout.
- Cashout queues a `MerchantPayout` (pending → master ops marks paid after MoMo send, or reject to restore balance).
- Dashboard: `/developers/dashboard#settlement`. Master queue: Partner integrations → Merchant cashouts.

## White-labelling

On `/developers/dashboard#branding` set:

- Display name, logo URL, primary/accent hex colors
- Support email / URL
- **White-label mode** — hides OPGB marketing chrome on checkout; keeps a small “Secure payments by OpenPayGB” line

### Can OpenPayGB charge for white-labelling?

**Yes.** Platform operators configure this in **Master → OPGB console → Fees & white-label**:

| Fee | Default | When charged |
|-----|---------|--------------|
| White-label per-charge fee | **1%** of order (or fixed / none) | Added into `platformFeeUgx` on every charge while `whiteLabelMode` is on |
| White-label activation | **0 UGX** (configurable) | One-time debit from merchant `settlementBalanceUgx` the first time white-label is enabled |

Merchants see pricing and sample quotes on `/developers/dashboard#branding`. Insufficient settlement balance blocks activation until they collect more payments (or master sets activation fee to 0).

## Holistic OPGB platform console

Master operators use **`/admin/master/opgb-ops`** — a multi-tab dashboard:

1. Overview KPIs  
2. Charges monitor  
3. Fees & white-label pricing  
4. Cards registry  
5. Card settings  
6. Cashouts & partners  
7. Withdraws & disputes  

Developer-facing multi-section UI remains `/developers/dashboard` (transactions, settlement, fees, branding, keys, webhooks).

## Sandbox

When `LIVEPAY_API_KEY` is not configured and `NODE_ENV !== production` (or `OPENPAYGB_CHARGES_SANDBOX=1`), checkout shows **Sandbox: mark as paid**.

## Related

- [PLATFORM_UPDATE_2026-09.md](./PLATFORM_UPDATE_2026-09.md) — commands + logins + recipes
- [PARTNER_API.md](./PARTNER_API.md) — full Partner API
- [DEVELOPER_ECOSYSTEM.md](./DEVELOPER_ECOSYSTEM.md) — developer portal
- [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md) — seed credentials
- Tuition checkout remains `/pay/{orgSlug}` (separate from merchant charges)
