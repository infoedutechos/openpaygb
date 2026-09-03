# Platform update pack — September 2026

**Last updated:** 2026-09-03  
**Purpose:** Single no-omission reference for everything shipped in the Uwais SMIS + OpenPayGB payment-provider workstream, including **commands**, **login details**, **URLs**, and **previous vs current** behaviour.

Related deep-dives:

| Doc | Topic |
|-----|--------|
| [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md) | All seed logins & local URLs |
| [OPENPAYGB_PAYMENT_PROVIDER.md](./OPENPAYGB_PAYMENT_PROVIDER.md) | Merchant charges, fees, white-label, cashout |
| [PARTNER_API.md](./PARTNER_API.md) | Partner scopes & HTTP API |
| [DEVELOPER_ECOSYSTEM.md](./DEVELOPER_ECOSYSTEM.md) | Developer portal |
| [UWAIS_SMIS_PRIORITY_ROADMAP.md](./UWAIS_SMIS_PRIORITY_ROADMAP.md) | Uwais P0–P4 status |
| [guides/USER_GUIDE_INDEX.md](./guides/USER_GUIDE_INDEX.md) | Role-based user guides |

---

## 1. Commands (copy-paste)

### 1.1 First-time / after pull

```bash
# From repo root (E:\ODELHUB-Pay or your clone)
npm install
npm run db:push
npm run db:generate
npm run seed
npm run seed:uwais
npm run dev
```

Open **http://localhost:3000** after the terminal shows **Ready** (Windows first compile can take 2–4 minutes).

### 1.2 After `prisma/schema.prisma` changes (Windows)

```powershell
# Stop all Node/Next first (EPERM on query engine is common if skip this)
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
npx prisma generate
npm run db:push
npm run dev
```

Or one-shot:

```bash
npm run schema:apply
npm run dev:fix
```

### 1.3 Day-to-day

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js (Webpack on Windows by default) |
| `npm run dev:clean` | Kill port 3000, clear `.next`, restart |
| `npm run dev:reset` / `npm run dev:fix` | Kill Node on 3000 + `prisma generate` + clean `.next` + start |
| `npm run seed` | Demo university + Riverside school + master/admin/students |
| `npm run seed:uwais` | Uwais school tenant + sample fee ledger CSV |
| `npm run admin:ensure` | Ensure org admin login from `SEED_ADMIN_*` |
| `npm run master:set-login` | Set/reset master from `SEED_MASTER_EMAIL` + `SEED_MASTER_PASSWORD` |
| `npm test` | Vitest unit tests |
| `npx vitest run lib/__tests__/merchant-charge.test.ts` | Merchant charge serialize + fee math |
| `npx vitest run lib/__tests__/school-fee-ledger.test.ts` | Fee ledger formula |
| `npm run docs:serve` | Docs hub at http://localhost:8787 |
| `npm run docs:build-index` | Refresh `docs/index.html` manifest |
| `npm run verify` | Project verify script |

### 1.4 Environment overrides (`.env.local`)

| Variable | Default / notes |
|----------|-----------------|
| `DATABASE_URL` or `MONGODB_URI` | Required |
| `JWT_SECRET` | 16+ chars |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `SEED_ADMIN_EMAIL` | `admin@odelhub.local` |
| `SEED_ADMIN_PASSWORD` | `ChangeMe_Admin123!` |
| `SEED_MASTER_EMAIL` | `master@odelhub.local` |
| `SEED_MASTER_PASSWORD` | `ChangeMe_Master123!` |
| `SEED_STUDENT_EMAIL` | `student@odelhub.local` |
| `SEED_STUDENT_PASSWORD` | `ChangeMe_Student123!` |
| `SEED_SCHOOL_ADMIN_EMAIL` | `school.admin@odelhub.local` |
| `SEED_SCHOOL_STUDENT_EMAIL` | `school.student@odelhub.local` |
| `SEED_UWAIS_ADMIN_EMAIL` | `uwais.admin@odelhub.local` |
| `SEED_UWAIS_ADMIN_PASSWORD` | Falls back to `SEED_ADMIN_PASSWORD` → `ChangeMe_Admin123!` |
| `OPENPAYGB_CHARGES_SANDBOX` | `1` forces sandbox confirm button |
| `LIVEPAY_API_KEY` | When unset in non-prod → sandbox checkout |

**Authoritative live demo passwords after customisation:** Master → `/admin/master#demo-logins` (not static docs alone).

---

## 2. Login details (complete matrix)

### 2.1 Platform master

| Field | Value |
|-------|--------|
| URL | http://localhost:3000/admin/login?master=1 |
| Email (seed) | `master@odelhub.local` |
| Password (seed) | `ChangeMe_Master123!` |
| After login | `/admin/master` |
| OPGB console | `/admin/master/opgb-ops` |

Production may use a different master email (e.g. `oiptechcore@gmail.com`) — use MAC demo-logins or `npm run master:set-login`.

### 2.2 University org admin (default tenant)

| Field | Value |
|-------|--------|
| URL | http://localhost:3000/school/login or `/admin/login` |
| Email | `admin@odelhub.local` |
| Password | `ChangeMe_Admin123!` |
| Org slug | `default` |
| After login | `/admin` |

### 2.3 Riverside demo school admin

| Field | Value |
|-------|--------|
| URL | http://localhost:3000/admin/login?school=1 |
| Email | `school.admin@odelhub.local` |
| Password | `ChangeMe_Admin123!` |
| Org slug | `riverside-demo` |
| Checkout | `/pay/riverside-demo` |

### 2.4 Uwais pilot school admin

| Field | Value |
|-------|--------|
| Command | `npm run seed:uwais` (prints Pay Code) |
| URL | http://localhost:3000/admin/login?school=1 |
| Email | `uwais.admin@odelhub.local` |
| Password | `ChangeMe_Admin123!` (or `SEED_UWAIS_ADMIN_PASSWORD`) |
| Org slug | `uwais` |
| Checkout | `/pay/uwais` |
| Fee ledger | `/admin/fee-ledger` |
| Fee structure | `/admin/fee-structure` |
| Go-live | `/admin/school-golive` |
| Cashbook | `/admin/school-cashbook` |
| School Pay Code | Printed by seed (6-digit; also on org settings) |

### 2.5 Students

| Role | URL | Slug | Email | Password |
|------|-----|------|-------|----------|
| University demo | `/student/login` | `default` | `student@odelhub.local` | `ChangeMe_Student123!` |
| Riverside school | `/student/login` | `riverside-demo` | `school.student@odelhub.local` | `ChangeMe_Student123!` |

### 2.6 Parent portal (Uwais / any school)

| Field | Value |
|-------|--------|
| URL | http://localhost:3000/parent |
| Lookup | School Pay Code + admission number (no password) |
| API | `POST /api/public/parent/lookup` |

### 2.7 Developer / Partner (OpenPayGB merchant)

| Field | Value |
|-------|--------|
| Register | http://localhost:3000/developers/register |
| Hub | http://localhost:3000/developers |
| Dashboard | http://localhost:3000/developers/dashboard |
| Provider lobby | http://localhost:3000/opgb |
| Auth | `clientId` + `clientSecret` from registration (cookie session) |
| API keys | Created in dashboard → `Authorization: Bearer odelhub_live_…` |

There is **no** seeded developer app by default — register one, then create keys with scopes `charges:create`, `charges:read`, `payouts:create`, `payouts:read`.

### 2.8 Guest tuition pay (no login)

| URL | Purpose |
|-----|---------|
| `/pay` | Pick school |
| `/pay/default` | University demo |
| `/pay/riverside-demo` | Riverside school |
| `/pay/uwais` | Uwais |

---

## 3. What changed — previous vs current

### 3.1 OpenPayGB as payment provider

| Area | Previous | Current (2026-09) |
|------|----------|-------------------|
| Third-party collect | Tuition `/pay/{slug}` only | Merchant charges + hosted `/opgb/checkout/{id}` |
| Partner charges API | Missing / incomplete | `POST/GET /api/partner/v1/charges` |
| Developer dashboard | Keys + webhooks mainly | + Transactions, settlement/cashout, fees, white-label |
| Platform fee on merchant | None | Default **2.5%** (min 500 UGX); pass-through or absorb |
| Merchant cashout | Consumer Dex offramp only | `MerchantPayout` + settlement balance + master queue |
| White-label | Name/logo only (free) | Colors + WL mode + **billable** activation + per-charge WL fee |
| Master OPGB ops | Disputes + withdraws only | **Multi-tab console** `/admin/master/opgb-ops` |
| Docs | Fragmented | This pack + updated provider/partner/local-dev docs |

### 3.2 Uwais / school fee ledger

| Area | Previous | Current |
|------|----------|---------|
| Pilot tenant | Manual | `npm run seed:uwais` |
| Spreadsheet → system | Manual | CSV import + `/admin/fee-ledger` |
| Outstanding formula | Divergent defaulters | Shared ledger formula |
| Discounts | Ad hoc | Adjustments API + UI |
| Parent view | None | `/parent` |
| SMIS pilots | None | Attendance, Qur’an, exams, audit (localStorage pilots) |
| Roadmap | Verbal | `docs/platform/UWAIS_SMIS_PRIORITY_ROADMAP.md` |

---

## 4. OpenPayGB merchant — end-to-end recipe

```bash
npm run dev
# Browser:
# 1. http://localhost:3000/developers/register → save clientId + clientSecret
# 2. http://localhost:3000/developers/dashboard → create API key (charges:* + payouts:*)
# 3. #fees → set pass-through / surcharge / payout MoMo number
# 4. #branding → optional white-label (pay activation if configured)
```

```http
POST /api/partner/v1/charges
Authorization: Bearer odelhub_live_…
Content-Type: application/json

{
  "amountUgx": 25000,
  "description": "Order #1",
  "redirectUrl": "http://localhost:3000/opgb",
  "externalRef": "demo-ord-1"
}
```

1. Open `checkoutUrl` → pay MoMo or **Sandbox: mark as paid**.
2. Dashboard **Transactions** shows fee split; **Settlement** shows balance.
3. **Request cashout** → Master **OPGB console → Cashouts & partners** → Mark paid.

### Fee economics (defaults)

| Mode | Customer pays | Merchant nets | OPGB keeps |
|------|---------------|---------------|------------|
| Pass-through | order + platform (+ WL if on) + surcharge | order + surcharge | platform (+ WL) |
| Absorb | order + surcharge | that − platform (− WL) | platform (+ WL) |

White-label extras (Master → Fees & white-label):

- Activation: default **0 UGX** (configurable)
- Per charge while WL on: default **1%** of order

---

## 5. Master OPGB console tabs

URL: **http://localhost:3000/admin/master/opgb-ops** (sign in as master first)

1. Overview — KPIs  
2. Charges — cross-app monitor  
3. Fees & white-label — platform defaults  
4. Cards registry — OpenPayGB cards  
5. Card settings — enable / guest / issue fee  
6. Cashouts & partners — merchant payouts + API keys/webhooks  
7. Withdraws & disputes — custodial ops  

APIs: `GET /api/master/opgb-console`, `GET|PATCH /api/master/opgb-merchant-fees`, `GET|POST /api/master/merchant-payouts`.

---

## 6. Uwais fee ledger — end-to-end recipe

```bash
npm run seed:uwais
# Note School Pay Code from console output
```

1. Login as `uwais.admin@odelhub.local` / `ChangeMe_Admin123!` at `/admin/login?school=1`
2. `/admin/fee-ledger` — import/list outstanding  
3. `/admin/fee-structure` — fee heads  
4. `/admin/school-golive` — checklist  
5. `/pay/uwais` — parent pay  
6. `/parent` — lookup by Pay Code + admission no.  
7. Sample CSV: `data/uwais-fee-ledger-sample.csv`

Formula: `(feeRequired − discounts) + previousBalance − (prevPaid + termPaid)`.

---

## 7. Key routes index (new + existing)

### Public / product

| Path | Role |
|------|------|
| `/opgb` | OpenPayGB provider lobby + integration guide |
| `/opgb/checkout/[id]` | Hosted merchant checkout (white-label aware) |
| `/developers` | Developer hub |
| `/developers/register` | Register app |
| `/developers/dashboard` | Merchant ops dashboard |
| `/parent` | Parent fee lookup |
| `/pay/uwais` | Uwais tuition checkout |

### Admin (school)

| Path | Role |
|------|------|
| `/admin/fee-ledger` | Student fee ledger |
| `/admin/fee-structure` | Fee heads |
| `/admin/school-golive` | Go-live checklist |
| `/admin/school-cashbook` | Cashbook |
| `/admin/school-attendance` | Attendance pilot |
| `/admin/school-quran` | Qur’an pilot |
| `/admin/school-exams` | Exams pilot |
| `/admin/school-audit` | Audit pilot |

### Master

| Path | Role |
|------|------|
| `/admin/master` | Platform overview |
| `/admin/master/opgb-ops` | **OPGB multi-tab console** |
| `/admin/master#partner-integrations` | Keys/webhooks (also in console tab) |
| `/admin/master#demo-logins` | Live credential directory |

### Partner / public APIs

| Method | Path | Scope / auth |
|--------|------|----------------|
| POST/GET | `/api/partner/v1/charges` | `charges:create` / `charges:read` |
| GET/POST | `/api/partner/v1/payouts` | `payouts:read` / `payouts:create` |
| GET | `/api/public/charges/[id]` | Public |
| POST | `/api/public/charges/[id]/livepay-start` | Public |
| POST | `/api/public/charges/[id]/sandbox-confirm` | Dev/sandbox |
| GET/PATCH | `/api/developers/merchant-settings` | Developer session |
| GET | `/api/developers/transactions` | Developer session |
| GET/POST | `/api/developers/payouts` | Developer session |

---

## 8. Tests to run before demo

```bash
npx vitest run lib/__tests__/merchant-charge.test.ts lib/__tests__/school-fee-ledger.test.ts
```

Smoke in browser:

1. Master login → `/admin/master/opgb-ops` tabs load  
2. `/opgb` shows Settlement, fees & white-label section  
3. Developer register → create charge → sandbox confirm → cashout request  
4. Uwais admin → fee ledger rows present  

---

## 9. Changelog chronology (this workstream)

1. Uwais tenant + CSV fee ledger import + admin UI  
2. Defaulters parity, discounts, fee structure, go-live, parent portal, cashbook, SMIS pilots  
3. OpenPayGB payment provider (charges API + hosted checkout + webhooks)  
4. Developer UX (copy buttons, collapsible sidebar, integration guide on `/opgb`)  
5. Merchant fees, settlement balance, cashout, transactions dashboard  
6. White-label branding + **billable** WL fees  
7. Holistic multi-tab OPGB platform console  
8. Docs pack (this file + cross-links)

---

*End of platform update pack.*
