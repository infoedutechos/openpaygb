# Payment system architecture — OdelPay & OpenPayGB

**Date:** 2026-06-09 · **Production URL:** `https://odelpay.vercel.app` · **Repo:** [openpayglobal/openpaygb](https://github.com/openpayglobal/openpaygb)

This document organizes the platform into three products and maps planned money-movement features.

---

## 1. Product lines

| Product | Audience | Scope today | Domain / brand |
|---------|----------|-------------|----------------|
| **OdelPay — Higher Institutions** | Universities, polytechnics, tertiary | **Live in this repo** — programmes, semesters, tuition checkout, receipts, TMA | `odelpay.vercel.app`, ODEL HUB Pay |
| **OdelPay — Schools** | Primary / secondary schools | **Same codebase**, school workspace registration (`/school/login`, org self-register) | Same deploy; UI copy & fee models tuned per tenant |
| **OpenPayGB** | Global consumers & partners | Closed-loop card ledger, MoMo/TON rails, future P2P & FX | `lib/open-pay-brand.ts`, `OpenPayCard` model |

### How they relate

```mermaid
flowchart TB
  subgraph odelpay [OdelPay]
    U[Universities / Higher Ed]
    S[Schools K-12]
  end
  subgraph openpaygb [OpenPayGB Global]
    Card[Virtual card ledger]
    Rails[MoMo · TON · future bank card]
    P2P[Send · Receive · Request · Convert]
  end
  U --> Tuition[Tuition checkout]
  S --> Tuition
  Tuition --> Rails
  Card --> Tuition
  Card --> P2P
  Rails --> P2P
```

**Current reality:** One Next.js app serves all tenants via `Organization` rows. Schools and universities differ by **tenant configuration** (programme structure, fee CSV, branding), not separate deployments.

**Recommended next schema step (when splitting UX):**

```prisma
enum InstitutionTier {
  university
  school
}
// Organization.institutionTier InstitutionTier @default(university)
```

Master Admin can filter orgs and show tier-specific nav (e.g. “semester” vs “term”).

---

## 2. Money features — OdelPay (Universities & Schools)

These four capabilities apply to **both** OdelPay tiers. OpenPayGB provides the rails underneath.

| Feature | User story | Building blocks in repo | Gap |
|---------|------------|-------------------------|-----|
| **Send money** | Parent sends UGX to student wallet / school fee pot | `Payment`, `OpenPayCard` balance, MoMo start APIs | **P2P transfer** API + ledger entries (not built) |
| **Receive money** | School receives tuition; student receives refund / stipend | `/pay/{orgSlug}`, webhooks (`livepay`, `relworx`, `mbiyo`, `momo_bridge`) | Refund rail UI polish |
| **Convert** | UGX ↔ TON at checkout; future fiat pairs | `lib/fx-live.ts`, `lib/fx-override.ts`, Dex hub (`/dex`) | Dedicated convert screen + quote API |
| **Request money** | “Pay this link” / invoice for a fee line | `POST /api/public/checkout/session`, programme quote | **Payment request** object (amount, memo, expiry, share URL) |

### Suggested implementation order

1. **Request money** — smallest diff: extend checkout session with `requestId`, shareable `/pay/{org}?request=…`.
2. **Receive money** — already core; expose “payment link generator” in school admin.
3. **Convert** — wire Dex hub quotes into TMA + student portal.
4. **Send money** — new `WalletTransfer` model, limits, KYC flags, Telegram notify.

---

## 3. OpenPayGB (global layer)

OpenPayGB is **not** only tuition. It is the **brand + ledger + PSP orchestration** layer:

| Capability | Status |
|------------|--------|
| Closed-loop UGX card (`OpenPayCard`) | **Shipped** — student opt-in, MoMo/TON fund, pay tuition |
| Master PSP toggles | **Shipped** — `#payment-providers` |
| Real Visa/Mastercard issuing | **Investigation** — see [VIRTUAL_CARD_INVESTIGATION.md](./VIRTUAL_CARD_INVESTIGATION.md) |
| Global send/receive/convert | **Planned** — Dex hub + partner APIs |

School and university tenants **consume** OpenPayGB rails; they do not run separate card programs unless Master enables overrides per org.

---

## 4. Guest card creation — can we implement it?

### Today (as shipped)

| Rule | Detail |
|------|--------|
| Card holder | **Must be a `Student` row** — `OpenPayCard.studentId` is `@unique` |
| Opt-in API | `POST /api/student/openpay-card/opt-in` requires **student session cookie** |
| Guest at `/pay` | May **spend** from an existing card if checkout session links `studentId` + active card |
| Guest cannot | Issue, fund, or opt into a new card without logging in |

See [OPENPAYGB_PLATFORM_CARD.md](./OPENPAYGB_PLATFORM_CARD.md) § Guest payers.

### Can we implement guest card creation?

**Yes — three viable designs:**

| Option | Description | Effort | Fits OpenPayGB global? |
|--------|-------------|--------|------------------------|
| **A. Post-pay claim (extend current)** | Guest pays tuition → `/student/claim` sets password → opt-in card | **Low** — mostly UX | Tuition-only |
| **B. Lightweight guest signup** | `POST /api/public/guest-card/register` creates minimal `Student` (email, name, org) + pending card | **Medium** — reuses schema | Good for OdelPay |
| **C. Holder-centric card** | New `OpenPayCardHolder` (email/phone, KYC status) decoupled from `Student`; optional link later | **Higher** — schema migration | **Best for OpenPayGB global** |

**Recommendation**

- **OdelPay (schools + universities):** Option **B** — guest enters email + phone on `/pay` or `/card/get`, gets OTP, receives pending card, funds via MoMo, later links to full student record when enrolled.
- **OpenPayGB global:** Option **C** — card is a wallet identity; tuition is one “spend category.”

**Compliance note:** Any guest issuance needs rate limits, email/phone verification, and Master-toggle `guestCardEnabled` (mirror `openPayCardEnabled` on `SiteUiSettings`).

---

## 5. Deployment note

Code on `main` passes CI. Production at `https://odelpay.vercel.app` requires a **Vercel production deployment** — see [VERCEL_ODELPAY_DEPLOY.md](./VERCEL_ODELPAY_DEPLOY.md).
