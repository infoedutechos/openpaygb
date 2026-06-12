# Ledger receipts, school unit registration & responsive master UI

**Last updated:** 2026-06-12 · **Production:** `https://odelpay.vercel.app`

This document captures the ledger-style receipt format (TEAM UNIVERSITY reference), multi-campus school registration, OdelPay product-line workspace registration, webhook alignment, and responsive master-console tables.

---

## Ledger receipts (TEAM UNIVERSITY format)

**Reference:** Printed university ledger statement — institution header, student name, programme, date range, then rows with **Date · Dr/Cr · Particulars · Vch Type · Vch No · Debit · Credit**, plus **Opening Balance** and **Dr Closing Balance** so debit and credit columns balance.

Tuition receipts include a **ledger account** tab/section alongside the fee breakdown (same data as email PDF).

| Column | Meaning |
|--------|---------|
| Date | Payment / posting date |
| Dr/Cr | Debit or credit indicator |
| Particulars | Line description (tuition, processing, etc.) |
| Vch Type | Voucher type (e.g. Receipt) |
| Vch No | Receipt / payment reference |
| Debit / Credit | Amount columns |
| Opening / Closing Balance | Running balance on the student account |

### Key files

| Area | Path |
|------|------|
| Ledger builder (server) | `lib/receipt-ledger.ts` |
| Client-safe types | `lib/receipt-ledger-types.ts` |
| Client-safe date format | `lib/receipt-ledger-display.ts` |
| Web UI (cards + `lg+` table) | `components/receipt/ReceiptLedgerAccount.tsx` |
| Tabbed receipt panel | `components/receipt/ReceiptViewPanel.tsx`, `components/ui/TabbedCardPanel.tsx` |
| Email HTML | `lib/receipt-ledger-html.ts` |
| PDF (landscape ledger) | `app/api/receipts/[paymentId]/pdf/route.ts` |
| Tests | `lib/__tests__/receipt-ledger.test.ts` |

Receipt page: `/receipt/[paymentId]` · API: `GET /api/receipts/[paymentId]`

### Demo student (local dev)

After `npm run seed`:

| Field | Value |
|-------|--------|
| Tenant | `default` — **TEAM UNIVERSITY 2023/2025 (demo)** |
| Student | `student@odelhub.local` / `ChangeMe_Student123!` |
| Name on ledger | Nabiddo Rehema Mbuga |
| Sign in | http://localhost:3000/student/login |

Seed creates **two confirmed installment payments** (Aug 2023 + Jan 2024) so the ledger shows invoice (Dr) and receipt (Cr) rows with a **closing balance**. The seed script prints:

```text
Demo ledger receipt (TEAM UNIVERSITY format): /receipt/<paymentId>
```

Open that URL while signed in as the demo student or school admin, or from **My receipts** / admin receipts after payment history exists.

---

## OdelPay workspace registration (two product lines)

`/admin/register` shows **two cards** before the form:

| Card | URL | Stored as |
|------|-----|-----------|
| **OdelPay — Higher Institutions** | `/admin/register?segment=higher` | `Organization.institutionTier = university` |
| **OdelPay — Schools** | `/admin/register?segment=schools` | `Organization.institutionTier = school` |

Implementation: `components/admin/WorkspaceRegistrationSegmentPicker.tsx`, `lib/institution-tier.ts`, `POST /api/public/organization-register` body field `registrationSegment`.

---

## School unit registration (campus / branch / ODEL)

Organizations can register as a **main campus** or a **child unit** (branch, ODEL unit, study campus/center, affiliate).

### Prisma (`Organization`)

- `unitKind` — `OrganizationUnitKind` enum
- `operatesUnitKinds[]` — kinds the main campus operates (main campus only)
- `parentOrganizationId` — FK to parent org (child units)
- `externalParentName` — free-text parent when not in the directory yet

### Intake & UI

| Area | Path |
|------|------|
| Zod intake + create | `lib/organization-intake.ts` |
| Labels / helpers | `lib/organization-unit-kinds.ts` |
| Registration picker | `components/admin/OrganizationUnitKindPicker.tsx` |
| Public register page | `app/admin/register/page.tsx` |
| Parent search API | `GET /api/public/organization-parent-search?q=` |

Child units require either `parentOrganizationSlug` (existing active/pending parent) or `externalParentName`.

### Master approval table

Master → **Organizations** shows **Unit type** and **Parent** on desktop table and mobile cards (`components/admin/master-org/*`). Data from `GET /api/master/organizations`.

---

## Webhook secrets alignment

Run after every deploy or env sync:

```powershell
npm run webhooks:alignment-check
```

Exits **0** when `MBIYO_WEBHOOK_SECRET`, `MOMO_WEBHOOK_SECRET`, and `LIVEPAY_WEBHOOK_SECRET` are set locally / in CI env. Exits **1** when any are missing (expected on a fresh clone — paste secrets after `npm run deployment:provision-sync`).

Public read-only APIs (no secret values):

- `GET /api/public/webhook-alignment`
- `GET /api/public/mbiyo-config`
- `GET /api/public/momo-config`

Full guide: [WEBHOOK_SECRETS_ALIGNMENT.md](./WEBHOOK_SECRETS_ALIGNMENT.md)

---

## Responsive master settings tables

These Master console sections use **mobile card lists** (`lg:hidden`) and **desktop tables** (`hidden lg:block`):

| Section | Component |
|---------|-----------|
| Organizations (approval) | `app/admin/master/organizations/page.tsx` |
| Knowledge base articles | `components/admin/MasterKnowledgeBaseSettings.tsx` |
| Platform communications | `components/admin/MasterPlatformCommunicationsSettings.tsx` |
| OpenPay card registry | `components/admin/OpenPayCardsRegistryPanel.tsx` |

Breakpoint: **`lg` (1024px)** for org approval; **`lg`** for KB / comms / cards on the master overview page.

---

## TMA admin deep-links (mobile-safe routes)

Telegram Mini App admin quick actions and bottom-nav tabs should open routes that already have mobile layouts:

| Role | Safe routes |
|------|-------------|
| School admin | `/admin/students`, `/admin/payments`, `/admin/reports`, `/admin/programmes`, `/admin/profile` |
| Master admin | `/admin/master/organizations`, `/admin/payments`, `/admin/master#openpay-cards-overview`, `/admin/reports` |

Implementation: `components/tma/TmaApp.tsx` — `SchoolAdminApp` / `MasterAdminApp` tab panels link to the routes above instead of generic `/admin` only.

TMA shell: `/tma` · See [TELEGRAM_MINI_APP.md](./TELEGRAM_MINI_APP.md)

---

## Database & verification (each environment)

After pulling schema changes:

```powershell
npm run dev:kill
npm run db:push
npm run db:generate
npm run verify
```

`Organization.unitKind` and related fields require `db:push` on production (Vercel build runs `prisma generate`; schema push is operational via `npm run db:push` or deploy hook).

---

## Related docs

- [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md)
- [SCHOOL_WORKSPACE_SELF_REGISTER.md](./SCHOOL_WORKSPACE_SELF_REGISTER.md)
- [MULTI_TENANT_FLOW.md](./MULTI_TENANT_FLOW.md)
- [BACKLOG.md](./BACKLOG.md) — B-OPS-02, B-UX-05b
