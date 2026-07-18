# User Guide: Higher Institution Admin (`org_admin`)

**Audience:** Institution staff managing a university / tertiary workspace (`institutionTier: university`).  
**Product line:** OdelPay — Higher Institutions  
**Last updated:** 2026-07-18

You manage **programmes**, **year/semester** fee schedules, students, admission format, receipt letterhead, online payments, and reports. This guide does **not** use school Session / Class registration jargon as the primary model — for K–12 ERP flows see [USER_GUIDE_ADMIN_SCHOOLS.md](./USER_GUIDE_ADMIN_SCHOOLS.md).

---

## Overview

Higher-institution admins operate the Tuition Hub with a university-oriented sidebar: Dashboard, Tuition balance, Students, Programs, Payments, Virtual cards, Receipts, Reports, Users, Settings.

Primary entry:

- Login: `/school/login` → `/admin`
- Register workspace: `/admin/register?segment=higher`
- Public lobby: `/OdelPayUniversities`

---

## Primary URLs

| Purpose | URL |
|---------|-----|
| Admin login | `/school/login` |
| Tuition hub dashboard | `/admin` |
| Profile | `/admin/profile` |
| Tuition balance | `/admin/tuition-balance` |
| Students | `/admin/students` |
| Payments | `/admin/payments` |
| Payment requests | `/admin/payment-requests` |
| Virtual cards | `/admin/virtual-cards` |
| Programs | `/admin/programmes` |
| Receipts | `/admin/receipts` |
| Reports | `/admin/reports` |
| Users | `/admin/users` |
| Settings | `/admin/settings` |
| Admission number format | `/admin/settings#admission-number` |
| Receipt letterhead | `/admin/settings#receipt-letterhead` |
| Help | `/help` |

---

## Tuition Hub sidebar (higher)

Defined in `components/admin/TuitionAdminShell.tsx` (`UNIVERSITY_SEGMENTS`).

| Sidebar item | Route | Purpose |
|--------------|-------|---------|
| Dashboard | `/admin` | Institution summary and quick actions |
| Profile | `/admin/profile` | Admin profile |
| Tuition balance | `/admin/tuition-balance` | Paid vs outstanding + progress/installments |
| Students | `/admin/students` | Student records and portal actions |
| Payments | `/admin/payments` | Payment list, status, reconciliation |
| Payment requests | `/admin/payment-requests` | Payment request queue |
| Virtual cards | `/admin/virtual-cards` | OpenPayGB card records |
| Programs | `/admin/programmes` | Programme and fee schedule management |
| Receipts | `/admin/receipts` | Receipt lookup and PDF |
| Reports | `/admin/reports` | Tuition and operational reporting |
| Users | `/admin/users` | Workspace users |
| Settings | `/admin/settings` | Admission format, letterhead, password |

Also available: Dex hub link for university tenants; dashboard chat; logout.

---

## Login and first access

1. Open `/school/login`.
2. Confirm school/institution admin mode.
3. Enter credentials issued by platform operations or registration.
4. Redirect to `/admin` (or validated `next`).
5. Verify the institution name in the shell.

New workspaces need approval and admin account creation before first login — [../ORGANIZATION_REGISTRATION.md](../ORGANIZATION_REGISTRATION.md).

---

## Settings callouts (do these early)

### Admission / registration number format

**Path:** `/admin/settings#admission-number`  
**Full doc:** [../ADMISSION_NUMBER_FORMAT.md](../ADMISSION_NUMBER_FORMAT.md)

1. Configure prefix, separator, year token (calendar / academic label / none), sequence digits, start value.
2. Save and confirm the preview example.
3. Next numbers follow a **registered-first** sequence across students already in the org.
4. On create student, use **Configure admission number format** if not set; allocate via `GET /api/students/next-admission`.

### Receipt letterhead

**Path:** `/admin/settings#receipt-letterhead`  
**Full doc:** [../RECEIPT_BRANDING.md](../RECEIPT_BRANDING.md)

1. Upload institution letterhead logo.
2. Set phone, email, address.
3. Confirm dual branding (MAC platform + institution) on Preview, PDF, and `/receipt/<paymentId>`.

---

## Day-to-day how-tos

### 1) Dashboard review

1. Open `/admin`.
2. Check recent collections and operational widgets.
3. Clear any workspace email verification or DB degraded banners.
4. Use quick links for students, payments, and programmes.

### 2) Manage programmes and fee schedules

1. Open `/admin/programmes`.
2. Create or edit programme code/name and track.
3. Add fee lines per **year / semester** / recurrence.
4. Validate total tuition + functional fees for each period.
5. Re-test quote/checkout with `/pay/<orgSlug>`.

Related APIs:

- `GET/POST /api/admin/programmes`
- `PATCH/DELETE /api/admin/programmes/[id]`
- `POST /api/admin/programmes/[id]/fees`
- `PATCH/DELETE /api/admin/programmes/[id]/fees/[feeId]`

### 3) Manage student records

1. Go to `/admin/students`.
2. Search by name, email, phone, programme code, admission number.
3. Open `/admin/students/[id]` for deep edits and share card.
4. Allocate admission numbers (next-admission) and set portal passwords as needed.
5. Students sign in at `/student/login?segment=higher` with email **or admission number** + password.

Supporting APIs:

- `GET/POST /api/students`
- `GET /api/students/[id]`
- `GET /api/students/next-admission`
- `PATCH /api/students/[id]/portal-password`

### 4) Tuition balance management

1. Open `/admin/tuition-balance`.
2. Search by student/programme; sort outstanding amounts.
3. Expand balance panel for context outstanding, installment next due, per-period progress.
4. Open the student record from the row for follow-up.

Source: `GET /api/admin/tuition-balances`.

### 5) Payments operations and reconciliation

1. Open `/admin/payments`.
2. Filter by status, rail, date, student.
3. Inspect pending/failed rows; confirm webhook-driven transitions.
4. Handle cancellations/refunds per institution policy.

Core APIs:

- `GET/POST /api/payments`
- `GET/PATCH /api/payments/[id]`
- `POST /api/payments/[id]/cancel`
- `POST /api/payments/[id]/refund`

### 6) Receipts and reporting

1. Open `/admin/receipts` for receipt navigation.
2. Open receipt detail; download/share PDF.
3. Open `/admin/reports` for summary exports and operational reporting.

Receipt APIs:

- `GET /api/receipts/[paymentId]`
- `GET /api/receipts/[paymentId]/pdf`

### 7) Virtual cards in institution operations

1. Open `/admin/virtual-cards`.
2. Review card status and balances (per-student OpenPayGB cards).
3. Assist students with activation/funding on `/student/card`.
4. Confirm card rail appears in payment history as `openpay_card`.

There is **no** separate institution OPGB “treasury wallet” screen in the Tuition Hub. Student OPGB balances and withdraws use the student portal + Dex (`/dex/offramp`); masters operate the withdraw queue at `/admin/master/opgb-ops`. Use the Dex sidebar link for crypto rails when enabled.

### 8) Users and settings

1. Open `/admin/users` to maintain workspace users.
2. Open `/admin/settings` for admission format, letterhead, and password/security.
3. Rotate passwords for compromised accounts immediately.

---

## Fee and tuition governance best practices

- Keep programme duration and semester structure aligned with fee rows.
- Avoid overlapping fee lines unless intentionally distinct (`feeKey`).
- Reconcile outstanding balances weekly.
- Monitor installment plans with overdue “next due” slices.
- Keep student email accuracy high for receipt and claim workflows.
- Configure admission format before mass student import/create.

---

## Working with student portal and guest pay

| Journey | URL |
|---------|-----|
| Student sign-in | `/student/login?segment=higher` |
| Registration | `/student/register` |
| Guest-to-portal claim | `/student/claim` |
| Guest checkout | `/pay/<orgSlug>` |
| Lobby | `/OdelPayUniversities` |

When a student says “I paid but cannot see it”:

1. Verify payment status in admin payments.
2. Confirm they used the correct org slug and email.
3. Direct to `/student/claim` if they paid as guest.
4. Confirm receipt at `/receipt/<paymentId>`.

---

## Troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| Cannot access `/admin` | Session expired or wrong role | Re-login via `/school/login` |
| Student not found in balance list | Filter too narrow | Clear search; verify workspace |
| Balance higher than expected | Fee rows changed after payments | Review programme fee history and payment contexts |
| Payment remains pending | Rail callback not received | Check webhooks with platform master |
| Student cannot login | No portal password set | Set portal password from student tools |
| Admission format CTA on create | Format not saved | Complete `/admin/settings#admission-number` |
| Guest cannot claim | Email/slug mismatch | Validate checkout email and org slug |
| Receipts lack institution logo | Letterhead missing | `/admin/settings#receipt-letterhead` |

---

## Escalation to platform master

Escalate when you need:

- Tenant-level destination wallet or processing fee changes
- Rail credential / webhook secret updates
- Environment variable or deployment fixes
- Partner API key provisioning
- Organization-level approval/status adjustments

Master console: `/admin/master`.

---

## Support

- Help center: **[/help](/help)**
- Knowledge base copilot on the tuition hub
- Talk to an agent when configured

Related: [USER_GUIDE_INDEX.md](./USER_GUIDE_INDEX.md) · [USER_GUIDE_STUDENT_HIGHER.md](./USER_GUIDE_STUDENT_HIGHER.md) · [../ADMISSION_NUMBER_FORMAT.md](../ADMISSION_NUMBER_FORMAT.md) · [../RECEIPT_BRANDING.md](../RECEIPT_BRANDING.md) · [../SCHOOL_ADMIN_PROGRAMMES.md](../SCHOOL_ADMIN_PROGRAMMES.md)
