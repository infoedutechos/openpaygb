# Product lines, standalone lobbies & school term fees

**Date:** 2026-06-03 · **Repo:** ODELHUB-Pay

This doc describes the three standalone product entry points, term-based fee UI for school tenants, and the local dev quick start.

---

## Local dev quick start

```bash
npm run db:push
npm run seed
npm run dev
```

Open **http://localhost:3000** after the terminal shows **Ready**.

Prerequisites: **`.env.local`** with `DATABASE_URL` (or `MONGODB_URI`). See **[LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md)** for seed logins and troubleshooting.

---

## 1. Standalone product platforms

Three independent product lines are exposed on the home lobby and as dedicated routes:

| Platform | Route | Audience | What it does |
|----------|-------|----------|--------------|
| **OdelPay — Higher Institutions** | `/OdelPayUniversities` | Universities, polytechnics, tertiary | Lists active `institutionTier: university` tenants; links to `/pay/{slug}` |
| **OdelPay — Schools** | `/OdelPaySchools` | Primary / secondary schools | Lists active `institutionTier: school` tenants; term-based checkout copy |
| **OpenPayGB** | `/opgb` | Students, parents, global consumers | Standalone Dex / OPGB entry — wallet, buy, P2P; links to `/dex` |

**Config:** `lib/ecosystem/product-lines.ts` · **UI:** `components/ecosystem/ProductLineLanding.tsx` · **Pages:** `app/OdelPayUniversities/`, `app/OdelPaySchools/`, `app/opgb/`.

Home cards (`components/ecosystem/ProductLinesSection.tsx`) use the same `primaryHref` values.

**Bottom nav:** `/OdelPayUniversities` and `/OdelPaySchools` highlight **Lobby**; `/opgb` highlights **Dex** (`components/hub/TuitionHubBottomNav.tsx`).

---

## 2. Term-based fees for schools (`institutionTier === school`)

School tenants use **Term 1–3** in the UI. The database still stores period index in the `semester` column and recurrence `per_semester` — no schema migration required for the term phase.

### Label source

`lib/academic-period.ts` — `academicPeriodLabels(tier)` returns Term vs Semester strings for checkout, admin, receipts, and quotes. `receiptYearPeriodLabel()` formats ledger/receipt lines (e.g. `Yr 1 · Term 2`).

### Where tier-aware labels apply

| Area | Key paths |
|------|-----------|
| Checkout wizard | `app/pay/PayWizard.tsx`, `components/pay/PayFeesBreakdown.tsx` |
| Programme quotes | `app/api/programmes/[code]/quote/route.ts` |
| School admin programmes | `components/admin/AdminProgrammesManager.tsx` |
| Receipt breakdown | `lib/receipt-lines.ts`, `components/receipt/ReceiptFeeBreakdown.tsx` |
| Receipt PDF / email | `app/api/receipts/[paymentId]/pdf/route.ts`, `lib/receipt-email.ts` |
| Ledger particulars | `lib/receipt-ledger.ts` |
| Recurrence labels | `lib/programme-fee-labels.ts` |

### Registration segment

| Segment | Register URL | `Organization.institutionTier` |
|---------|--------------|--------------------------------|
| Higher institutions | `/admin/register?segment=higher` | `university` |
| Schools | `/admin/register?segment=schools` | `school` |

### Public org list filter

`GET /api/public/organizations?tier=university|school` — used by product-line lobbies (`lib/organizations.ts` → `listActiveOrganizationsByTier`).

---

## 3. Seed demo tenants

After `npm run seed`:

| Tenant | Slug | Tier | Pay URL |
|--------|------|------|---------|
| TEAM UNIVERSITY 2023/2025 (demo) | `default` | `university` | http://localhost:3000/pay/default |
| Riverside Academy (demo school) | `riverside-demo` | `school` | http://localhost:3000/pay/riverside-demo |

**Riverside** has programme **P7-STREAM** with fee rows for **Term 1–3** (year 1). Console output includes the school demo URL and `/OdelPaySchools` lobby link.

University demo student **Nabiddo Rehema Mbuga** and ledger receipt payments remain on the **`default`** tenant — see **[LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md)**.

---

## 4. Try it locally

| What | URL |
|------|-----|
| ODEL HUB lobby | http://localhost:3000/ |
| Higher institutions lobby | http://localhost:3000/OdelPayUniversities |
| Schools lobby | http://localhost:3000/OdelPaySchools |
| OpenPayGB lobby | http://localhost:3000/opgb |
| University checkout (semesters) | http://localhost:3000/pay/default |
| School checkout (terms) | http://localhost:3000/pay/riverside-demo |
| Request school workspace | http://localhost:3000/admin/register?segment=schools |

---

## Related docs

- [PAYMENT_SYSTEM_ARCHITECTURE.md](./PAYMENT_SYSTEM_ARCHITECTURE.md) — product-line architecture
- [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md) — seed credentials and dev commands
- [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md) — workspace lifecycle
- [SCHOOL_ADMIN_PROGRAMMES.md](./SCHOOL_ADMIN_PROGRAMMES.md) — programme admin for school tenants
- [LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md](./LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md) — receipt ledger format
