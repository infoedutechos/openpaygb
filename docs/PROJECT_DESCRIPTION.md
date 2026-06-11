# ODEL HUB Pay / OpenPayGB Project Description

## Product overview

ODEL HUB Pay is a multi-tenant tuition payments platform built with Next.js 15 App Router and Prisma on MongoDB. It supports school-specific workspaces, student and guest checkout, and a shared platform operator layer ("master admin") that governs tenant onboarding, policy, infrastructure configuration, and integrations.

The tuition product is co-located in the same repository/database with additional ODEL HUB modules (Play, Dex, notifications, knowledge). This document focuses on the tuition and OpenPayGB payment domain while noting shared platform services where relevant.

Core characteristics:

- Multi-tenant by `Organization` (`slug`, lifecycle status, fee/FX overrides).
- Tuition charging by programme, year, semester, fee line, and installment plan.
- Multiple payment rails: TON, Mbiyo, LivePay, Relworx, VixonPay, and OpenPayGB virtual card balance.
- Student portal and guest checkout with shared receipt and payment tracking.
- Master console for platform governance, environment/security operations, backup, and partner integration.

## User roles and access model

| Role | Purpose | Primary UI | Auth/session |
|---|---|---|---|
| Platform master admin | Operate platform-wide settings, approve schools, manage partner rails and env | `/admin/master` | Admin JWT cookie, `AdminUser.role = master` |
| School admin (`org_admin`) | Manage a single institution: students, programmes, payments, reports | `/admin` (or `/school-admin`) | Admin JWT cookie scoped to `organizationId` |
| Student | View dashboard, pay tuition, monitor balance/progress, manage virtual card | `/student`, `/my/dashboard`, `/student/balance` | Student cookie from `/api/auth/student-login` or claim/signup |
| Guest payer | Pay tuition without portal account | `/pay` and `/pay/[orgSlug]` | Checkout session token/cookie for temporary identity |
| Partner integrator | Read payments/orgs and receive payment events | API only | API key (`Authorization: Bearer odelhub_live_...`) |

## Architecture

### Application stack

- Frontend/backend: Next.js App Router (`app/**`) with server routes under `app/api/**`.
- Database: MongoDB via Prisma (`prisma/schema.prisma`).
- Runtime: Node.js (Vercel-first deployment model in docs).
- Auth: cookie sessions for admin/student, plus checkout session for guest flow.
- Background/ops endpoints: cron and webhook handlers under `/api/cron/*` and `/api/webhooks/*`.

### Key functional modules

- Tuition checkout and quote engine: `app/pay/**`, `app/api/public/checkout/**`, `lib/tuition-balance*`, `lib/installments`.
- Admin operations: `app/admin/**`, `app/api/admin/**`, `app/api/master/**`.
- Student portal: `app/student/**`, `app/my/**`, `app/api/student/**`.
- Virtual card: `app/student/card`, `app/api/student/openpay-card/**`, `lib/openpay-card*`.
- Partner API/webhooks: `app/api/partner/v1/**`, `app/api/master/partner/**`.
- Dex Hub + OPGB ledger: `app/dex/**`, `lib/opgb-ledger.ts`, `app/api/public/dex/**`, `app/api/student/dex/**` (custodial Phase 1–3; see `docs/OPGB_TOKEN_ECOSYSTEM.md`).

## Multi-tenancy model

Tenant root entity is `Organization` (`prisma/schema.prisma`):

- Unique school `slug`, display name, payout wallet, and status (`active`, `pending`, `rejected`).
- Tenant-level overrides:
  - Checkout platform fee kind/value.
  - FX override strategy (inherit/none/fixed/buffer).
  - Favicon and branding artifacts.
- Tenant-isolated records: programmes, students, payments, admin users, partner keys/webhooks, mobile money providers.

Resolution rules:

- Public checkout uses active slugs only (`/pay/[orgSlug]`, `assertActiveOrganizationSlug`).
- `org_admin` is hard-scoped to their `organizationId`.
- `master` can operate globally and optionally filter by org slug in scoped tools.
- Workspace registration can require master approval or auto-activate after email verification (policy from site settings).

## Tuition lifecycle

1. Programme setup:
   - School-specific `Programme` with `durationYears`, `semestersPerYear`.
   - Detailed `ProgrammeFee` lines with recurrence (`once`, `per_semester`, `per_year`).
2. Student record:
   - Assigned `programmeCode`, current `year` and `semester`.
3. Quote and checkout:
   - Fee selection mode: semester, year, or whole programme.
   - Optional installment schedules (`installmentCount`, slices/plan IDs).
4. Payment creation:
   - Pending `Payment` row with UGX total, TON snapshot, selected rail, included fee IDs.
5. Confirmation:
   - Rail-specific confirmation via webhooks and helper confirmers (`lib/*/confirm-payment`).
6. Balance/progress update:
   - Tuition balance summary recomputed from confirmed payments and fee schedule.
   - Programme progress exposed in student/admin tuition balance views.
7. Receipts:
   - Receipt page and PDF for confirmed payments: `/receipt/[paymentId]`, `/api/receipts/[paymentId]`, `/api/receipts/[paymentId]/pdf`.

## Payment rails

Supported rails are represented in `PaymentRail` enum:

- `web` / TON transfer flow (Ton Pay/TonConnect assisted checkout).
- `mbiyo` (Mbiyo collect + `/api/webhooks/mbiyo`).
- `livepay` (`/api/public/checkout/livepay-start`, `/api/webhooks/livepay`).
- `relworx` (`/api/public/checkout/relworx-start`, `/api/webhooks/relworx`).
- `vixonpay` (`/api/public/checkout/vixonpay-start`, `/api/webhooks/vixonpay`).
- `openpay_card` (closed-loop card balance payment via `/api/public/checkout/openpay-card-pay`).
- Also available for custom bridges: `momo_bridge`, provider webhooks at `/api/webhooks/provider/[code]`.

Webhook layer:

- Canonical webhook endpoints:
  - `/api/webhooks/livepay`
  - `/api/webhooks/mbiyo`
  - `/api/webhooks/momo`
  - `/api/webhooks/relworx`
  - `/api/webhooks/vixonpay`
  - `/api/webhooks/provider/[code]`
- Idempotency and replay protection supported via processed webhook storage.

## OpenPayGB virtual card

OpenPayGB is a platform virtual card product linked to student accounts:

- Student card screen: `/student/card`.
- Card state model: `pending_issue` -> `active`.
- Activation options:
  - TON transfer issue fee: `/api/student/openpay-card/issue/transfer`.
  - MoMo issue fee collect: `/api/student/openpay-card/issue/momo-start` (LivePay/Relworx/VixonPay).
- Funding options:
  - TON transfer topup: `/api/student/openpay-card/fund/transfer`.
  - MoMo topup collect: `/api/student/openpay-card/fund/momo-start`.
- Tuition payment from card:
  - `/api/public/checkout/openpay-card-pay`.

Master-level governance:

- Card enable/disable and issue fee controls in master console (`MasterOpenPayCardSettings`).
- Fleet visibility in `MasterOpenPayCardsOverview` and `/api/master/openpay-cards`.

## Tuition balance and progress

Balance surfaces:

- Student self-service: `/student/balance`, `/api/student/balance`.
- Admin tuition hub: `/admin/tuition-balance`.
- Master-wide tuition balance: `/admin/master/tuition-balance`.
- Admin data endpoint: `/api/admin/tuition-balances`.

Balance semantics:

- Outstanding/paid computed per year-semester context.
- Installment-aware plan tracking (next due index, full plan totals, partial completion).
- Programme progress indicators:
  - Completed vs remaining semesters/years.
  - Per-period paid/remaining indicators.

## Organization registration and onboarding

Self-service school onboarding:

- Registration UI: `/admin/register`.
- APIs:
  - `POST /api/public/organization-register`
  - `POST /api/public/organization-register/resend`
  - `GET /api/public/organization-register/verify`
  - `GET /api/public/school-workspace-registration-policy`

Approval and provisioning:

- Master reviews pending schools in `/admin/master` and organizations screen.
- Master APIs:
  - `GET/POST /api/master/organizations`
  - `PATCH /api/master/organizations/[id]`
  - `POST /api/master/admins` (create org admin account)
- Activation can clone baseline programmes and FX from template org (`default`).

## Admin consoles

### Master console (`/admin/master`)

Primary platform operations:

- Organizations management and approval.
- Programme duration governance (`/admin/master/programmes`).
- Tuition balance platform view (`/admin/master/tuition-balance`).
- Platform fee controls and TON/UGX policy.
- Virtual card settings and card fleet oversight.
- Mobile money provider registry.
- Partner API keys and outbound webhooks.
- Environment registry/override audit (`/api/master/deployment-env`).
- Knowledge base and communication controls.
- Backup and project download tooling.

### School admin tuition hub (`/admin`)

Tenant operations:

- Dashboard, students, payments, programmes.
- Tuition balance, receipts, reports, users, settings.
- Virtual cards for tenant users.
- Role-gated operations via `org_admin` or master acting in school context.

## Partner API and webhooks

Partner docs baseline: `docs/PARTNER_API.md`.

Inbound partner API:

- `GET /api/partner/v1/payments`
- `GET /api/partner/v1/payments/[id]`
- `GET /api/partner/v1/organizations`

Master integration management:

- API key lifecycle: `/api/master/partner/keys`, `/api/master/partner/keys/[id]`.
- Outbound webhook endpoints: `/api/master/partner/webhooks`, `/api/master/partner/webhooks/[id]`.

Outbound event pattern:

- `payment.confirmed` posts with HMAC signature header to partner endpoints.

## Backup and restore

Master-only backup APIs:

- `GET /api/master/backup` -> point-in-time tuition JSON export.
- `GET /api/master/backup/status` -> backup readiness/status.
- `POST /api/master/backup/restore` -> restore flow.

Project export:

- `GET /api/master/project-download?part=...` for full or partial documentation/data/source bundles.

## Deployment and operations

- Deployment target documented for Vercel (`docs/VERCEL_ENV_SETUP.md`, `docs/DEPLOYMENT_ARCHITECTURE.md`).
- App URL correctness (`NEXT_PUBLIC_APP_URL`) is critical for webhook callback resolution.
- Cron endpoints require secret-based protection (`CRON_SECRET`) and production secret checks.
- Health and operational checks exposed through `/api/health` and master environment status APIs.

## Security model

- Role-based access checks (`requireMaster`, admin/student cookie guards).
- Tenant scoping for org admin access; master-specific elevated routes.
- Webhook secret validation per rail/provider.
- Rate limiting across checkout/auth/webhook endpoints.
- Password reset/token flows for admin and student account recovery.
- Deployment env overrides stored encrypted at rest (`DeploymentEnvOverride`).

## Environment variables reference summary

Core required:

- `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`.

Tuition/payments:

- TON wallet + FX and confirmation settings (`ODELHUB_TON_WALLET_ADDRESS`, `DEFAULT_UGX_PER_TON`, `TON_CONFIRM_ENABLED`).
- Rail-specific keys/secrets for Mbiyo, LivePay, Relworx, VixonPay, MoMo.

Platform integrations:

- Telegram bot/webhook variables.
- Google OAuth for student sign-in.
- Email provider settings (`RESEND_API_KEY`, `RESEND_FROM`).
- Optional Vercel sync credentials for environment automation.

Detailed canonical reference lives in:

- `.env.example`
- `docs/VERCEL_ENV_SETUP.md`
- master env console (`/admin/master` -> Environment section)

## UI routes table (tuition-focused)

| Route | Audience | Purpose |
|---|---|---|
| `/pay` | Guest/student | Pick active school workspace |
| `/pay/[orgSlug]` | Guest/student | Full checkout wizard for selected school |
| `/receipt/[paymentId]` | All | Receipt page for payment |
| `/student/login` | Student | Student sign-in |
| `/student/register` | Student | Student account registration |
| `/student/claim` | Student/guest | Convert guest payment identity into portal account |
| `/student` | Student | Student home dashboard |
| `/student/balance` | Student | Tuition balance and progress |
| `/student/pay` | Student | Student pay flow |
| `/student/card` | Student | OpenPayGB virtual card panel |
| `/my/dashboard` | Student | Legacy/dashboard alias area |
| `/my/receipts` | Student | Payment history and receipts |
| `/my/settings` | Student | Password/security settings |
| `/school/login` | School admin | Friendly entrypoint to school admin login |
| `/admin/login` | Admin/master | Unified admin login with mode switching |
| `/admin/register` | Institution applicant | School workspace request/verification flow |
| `/admin` | Org admin/master | School tuition hub |
| `/admin/tuition-balance` | Org admin/master | School-level tuition balance overview |
| `/admin/master` | Master | Platform master console |
| `/admin/master/organizations` | Master | Tenant lifecycle and org controls |
| `/admin/master/programmes` | Master | Programme duration governance |
| `/admin/master/tuition-balance` | Master | Platform-wide tuition balance view |

Reference inventories:

- `docs/UI_ROUTES.csv` (generated list)
- `docs/UI_VS_CODEBASE.md`

## API inventory summary

From `docs/API_INVENTORY.csv`:

- Total discovered API routes: **~300** (run `npm run docs:inventory` for exact count).
- Major namespaces (approximate):
  - `/api/admin/*`: ~50
  - `/api/master/*`: ~43
  - `/api/auth/*`: ~19 (includes admin profile + profile-image)
  - `/api/public/checkout/*`: ~12 (+ additional `/api/public/*`)
  - `/api/partner/v1/*`: 3
  - `/api/student/*`: ~11
  - `/api/payments*`: 6
  - `/api/webhooks/*`: ~7

Tuition-critical API groups:

- Checkout: `/api/public/checkout/*`
- Tuition balances: `/api/student/balance`, `/api/admin/tuition-balances`, `/api/students/[id]/balance`
- Payment lifecycle: `/api/payments*`, `/api/student/payments/[id]/cancel`
- Webhooks: `/api/webhooks/*`
- Master operations: `/api/master/*`

## Data model summary (tuition domain)

Primary Prisma models:

- `Organization`
- `AdminUser`, `AdminPasswordResetToken`
- `Programme`, `ProgrammeFee`
- `Student`, `StudentSignupToken`
- `Payment`
- `OpenPayCard`, `OpenPayCardTopup`
- `FxRate`
- `PartnerApiKey`, `PartnerWebhookEndpoint`, `PartnerWebhookDelivery`
- `MobileMoneyProvider`
- `ProcessedWebhook`
- `SiteUiSettings`
- `DeploymentEnvOverride`, `DeploymentEnvRegistryCustom`

Key enums:

- `PaymentRail`, `PaymentStatus`
- `AdminRole`
- `OrganizationTenantStatus`
- `ProgrammeTrack`, `ProgrammeFeeRecurrence`
- `PlatformAudience`

## Testing and quality controls

Project verification pipeline:

- `npm run verify` (lint, unit tests, type checks, schema validation).
- Route inventories generated by `npm run docs:inventory`.
- Tuition-focused tests exist in `lib/__tests__`, including:
  - `tuition-balance.test.ts`
  - `tuition-balance-compact.test.ts`
  - `tuition-progress.test.ts`

Additional protections:

- Runtime API validation with Zod schemas.
- Endpoint-level rate limiting and guarded error responses.
- Production secret checks for critical webhook/cron paths.

## Documentation index

Primary operational docs:

- `docs/PARTNER_API.md`
- `docs/MULTI_TENANT_FLOW.md`
- `docs/MASTER_ADMIN_FLOW.md`
- `docs/ADMIN_FLOW.md`
- `docs/ORGANIZATION_REGISTRATION.md`
- `docs/BACKUP_AND_RECOVERY.md`
- `docs/VERCEL_ENV_SETUP.md`
- `docs/DEPLOYMENT_ARCHITECTURE.md`
- `docs/UI_VS_CODEBASE.md` (regenerate: `npm run docs:inventory` — **76 UI routes**, **308 API handlers**)
- `docs/API_INVENTORY.csv`
- `docs/UI_ROUTES.csv`
- `docs/HOLISTIC_APP_AUDIT.md`, `docs/APP_STATUS_AUDIT.md`
- `docs/OPGB_TOKEN_ECOSYSTEM.md`, `docs/OPGB_CHECKOUT_CARD.md`

Role guides:

- `docs/guides/USER_GUIDE_MASTER_ADMIN.md`
- `docs/guides/USER_GUIDE_SCHOOL_ADMIN.md`
- `docs/guides/USER_GUIDE_STUDENT.md`
- `docs/guides/USER_GUIDE_GUEST_PAYER.md`
- `docs/guides/USER_GUIDE_PARTNER_INTEGRATOR.md`
