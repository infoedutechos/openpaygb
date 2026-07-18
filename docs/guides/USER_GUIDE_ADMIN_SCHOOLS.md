# User Guide: School Admin (Primary–Secondary / K–12)

**Audience:** `org_admin` staff for a school workspace (`institutionTier: school`).  
**Product line:** OdelPay — Schools  
**Last updated:** 2026-07-18

You manage sessions, classes/streams, students & bills, School Code checkout, admission format, receipt letterhead, and school reports. For universities, use [USER_GUIDE_ADMIN_HIGHER.md](./USER_GUIDE_ADMIN_HIGHER.md).

---

## Overview

School admins operate the **Tuition Hub** with a school ERP-style sidebar (Session, Class registration, Students / bills, Defaulters, Reports, and more). Parents pay via **School Code** or `/pay/<slug>`; learners sign in with **admission number + password**.

Primary entry:

- Login: `/school/login` (school admin mode) → `/admin`
- Register a new school workspace: `/admin/register?segment=schools`
- Schools lobby (public): `/OdelPaySchools`

---

## Primary URLs

| Purpose | URL |
|---------|-----|
| School admin login | `/school/login` |
| Tuition hub home (ERP dashboard) | `/admin/school-dashboard` |
| Classic admin home | `/admin` |
| Session | `/admin/school-session` |
| Accounts | `/admin/school-accounts` |
| Class registration | `/admin/school-structure` |
| Fee programmes | `/admin/programmes` |
| Students / bills | `/admin/students` |
| Defaulters | `/admin/defaulters` |
| Receipt of payments | `/admin/receipts` |
| Online payments | `/admin/payments` |
| Payment requests | `/admin/payment-requests` |
| Staff | `/admin/school-staff` |
| Outflow | `/admin/school-outflow` |
| Inventory | `/admin/school-inventory` |
| Reports | `/admin/school-reports` |
| Users | `/admin/users` |
| Settings | `/admin/settings` |
| Admission number format | `/admin/settings#admission-number` |
| Staff ID format | `/admin/settings#staff-id` |
| Receipt letterhead | `/admin/settings#receipt-letterhead` |
| Help | `/help` |

---

## Tuition Hub sidebar (schools)

Defined in `components/admin/TuitionAdminShell.tsx` (`SCHOOL_ERP_SEGMENTS`). Use **Session / Term** context from the school context bar when present.

| Sidebar item | Route | Purpose |
|--------------|-------|---------|
| Dashboard | `/admin/school-dashboard` | School KPIs and quick actions |
| Profile | `/admin/profile` | Admin profile |
| Session | `/admin/school-session` | Academic year lifecycle (new / edit / activate / delete) |
| Accounts | `/admin/school-accounts` | Income & expenditure accounts |
| Class registration | `/admin/school-structure` | Classes and streams |
| Fee programmes | `/admin/programmes` | Fee schedules (Term labels) |
| Students / bills | `/admin/students` | Learners, School Code panel, bulk bills, share cards |
| Defaulters | `/admin/defaulters` | Arrears views |
| Receipt of payments | `/admin/receipts` | Receipt lookup |
| Payment requests | `/admin/payment-requests` | Incoming payment requests |
| Staff | `/admin/school-staff` | Staff records |
| Outflow | `/admin/school-outflow` | Vouchers / salary outflow |
| Inventory | `/admin/school-inventory` | Stock |
| Reports | `/admin/school-reports` | Financial & records statements |
| Online payments | `/admin/payments` | Rail payments, reconciliation |
| Users | `/admin/users` | Workspace users |
| Settings | `/admin/settings` | Admission format, letterhead, password |

Also: dashboard chat button; logout in shell.

---

## Login and first access

1. Open `/school/login`.
2. Confirm **School admin** mode is selected.
3. Enter credentials issued at registration / by platform master.
4. You are redirected to `/admin` (or a safe `next` route). School tenants typically use the ERP dashboard at `/admin/school-dashboard`.
5. Verify the school name in the shell matches your institution.

If newly registered: wait for workspace approval and admin account creation before first login. See [../ORGANIZATION_REGISTRATION.md](../ORGANIZATION_REGISTRATION.md).

---

## Settings callouts (do these early)

### Admission / registration number format

**Path:** `/admin/settings#admission-number`  
**Details:** [../ADMISSION_NUMBER_FORMAT.md](../ADMISSION_NUMBER_FORMAT.md)

1. Open Settings → **Admission / registration number format**.
2. Set prefix, separator, year source (calendar / academic / none), sequence digits, and start sequence.
3. Save — live preview shows the next-style example.
4. Sequencing is **registered-first**: next number follows students already in the system.

On **Create student**, if format is not configured, use the **Configure admission number format** CTA (links to the same settings anchor). Prefetch next number via `GET /api/students/next-admission`.

### Receipt letterhead

**Path:** `/admin/settings#receipt-letterhead`  
**Details:** [../RECEIPT_BRANDING.md](../RECEIPT_BRANDING.md)

1. Upload a letterhead logo (favicon is a temporary fallback).
2. Enter phone, email, and address for the school block on receipts.
3. Save contacts.
4. Verify on Preview / PDF / public `/receipt/<paymentId>` — platform (MAC) + school dual branding.

---

## Day-to-day how-tos

### 1) Activate academic session

1. Open `/admin/school-session`.
2. Create a session label (e.g. `2025/2026`) if needed.
3. **Activate** the current session.
4. Confirm the context bar shows the active session / term.

### 2) Register classes and streams

1. Open `/admin/school-structure` (Class registration).
2. Add class (name/code).
3. Add streams under the class as needed.
4. Optionally **Import** classes (internal from another session, or external Results App when configured).
5. Edit or delete with confirmation when cleaning up.

### 3) Maintain fee programmes (Term language)

1. Open `/admin/programmes`.
2. Create or edit programme / fee track for the school.
3. Add fee lines per **year / term** (UI labels say Term, not Semester).
4. Validate totals for Fees / Other Requirements as configured.
5. Re-test quote/checkout on `/pay/<slug>`.

### 4) School Code (parent pay)

1. Open `/admin/students` — use the **School Code** panel.
2. Copy the 6-digit School Code and share it on admission letters / WhatsApp.
3. Tell parents: go to `/pay` → **Pay with School Code** → enter code (+ optional admission number).
4. API: `GET /api/admin/school-pay-code` · public lookup `POST /api/public/school-code-lookup`.

### 5) Create a student (admission + portal)

1. Go to `/admin/students`.
2. Open **New student** / create form.
3. If admission format is unset, click **Configure admission number format**.
4. Click refresh / next-admission to allocate via `GET /api/students/next-admission`.
5. Assign class/stream (and programme/year/term as required).
6. Optionally set portal password — learners sign in with **admission number + password** at `/student/login?segment=schools`.
7. Save. Open student detail for share card / QR.

### 6) Bulk assign bills by class

1. On `/admin/students`, open **Bulk assign bills (class)**.
2. Choose session/term and class (and stream if offered).
3. Select fee lines / amounts.
4. Submit to assign bills to matching learners.
5. Record or reconcile payments under **Receipt of payments** and **Online payments**.

API: `POST /api/admin/school/bills` (bulk body).

### 7) Student share card (QR)

1. Open `/admin/students/<id>`.
2. Use the student share card panel (print / copy / share).
3. Public URL: `/student/card/<id>` — shows admission number + School Code for parents.

### 8) Defaulters and collections

1. Open `/admin/defaulters`.
2. Filter due / overdue / pending / non-defaulters as available.
3. Follow up with parents using School Code + student card links.

### 9) Online payments and reconciliation

1. Open `/admin/payments`.
2. Filter by status, rail, date, student.
3. Inspect pending/failed rows; wait for webhook confirmation.
4. Cancel/refund only per school policy and platform capability.

### 10) Receipts with dual branding

1. Open `/admin/receipts`.
2. Open a payment receipt; Preview and download PDF.
3. Confirm school logo/contacts appear beside platform branding.
4. Public link: `/receipt/<paymentId>`.

### 11) Reports

1. Open `/admin/school-reports`.
2. Generate financial metric / cash flow / profit & loss / class bills / student account statements as offered.
3. Choose report period by **term** or date range, then **Generate**.

### 12) Users and security

1. Open `/admin/users` for workspace accounts.
2. Open `/admin/settings` for password and school-specific settings.
3. Rotate passwords for compromised accounts immediately.

---

## Supporting parents and learners

| Journey | URL |
|---------|-----|
| Parent School Code pay | `/pay` |
| Direct school checkout | `/pay/<slug>` |
| Student login | `/student/login?segment=schools` |
| Student register | `/student/register` |
| Guest claim | `/student/claim` |
| Student balance | `/student/balance` |

When someone says “I paid but cannot see it”:

1. Check status in `/admin/payments`.
2. Confirm School Code / slug and email or admission number.
3. Point guests to `/student/claim` if they need a portal.
4. Confirm receipt at `/receipt/<paymentId>`.

---

## Troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| Cannot access `/admin` | Session expired or wrong role | Re-login via `/school/login` |
| Parents cannot find School Code | Code not shared / inactive org | Open School Code panel; confirm org is active |
| Admission numbers look wrong | Format not configured | `/admin/settings#admission-number` |
| Next admission clashes | Manual override collision | Regenerate via next-admission; keep uniqueness per org |
| Receipts missing school logo | Letterhead not uploaded | `/admin/settings#receipt-letterhead` |
| Bulk bills empty class | Wrong session/class | Activate correct session; verify class membership |
| Payment remains pending | Rail callback not received | Escalate webhook secrets to platform master |

---

## School funds, accounts, and outflow (not a personal crypto wallet)

School admins do **not** have a personal OPGB org wallet on the Tuition Hub dashboard. School money is tracked in the ERP:

| View | URL | What you see |
|------|-----|--------------|
| Dashboard KPIs | `/admin/school-dashboard` | Received, outstanding, income vs expenditure |
| Accounts | `/admin/school-accounts` | Income & expenditure accounts and balances |
| Outflow | `/admin/school-outflow` | Vouchers, salary payments, fund-guarded cash out |

To pay suppliers or salary: use **Outflow** after funds are appropriated. Crypto/MoMo custodial withdraw queues for students live under Dex (`/dex/offramp`); platform masters clear withdraw ops at `/admin/master/opgb-ops`.

Virtual OpenPayGB **student** cards are a higher-institution feature (`/admin/virtual-cards`); school ERP focuses on bills and accounts instead.

---

## Escalation to platform master

Escalate when you need:

- Tenant wallet or processing fee changes
- Rail credential / webhook secret updates
- Environment or deployment fixes
- Partner API keys
- Organization approval / status adjustments

Master console: `/admin/master` (master role only).

---

## Support

- In-product help: **[/help](/help)**
- Knowledge base copilot on the tuition hub
- Talk to an agent when configured (platform social / Telegram links)

Related: [USER_GUIDE_INDEX.md](./USER_GUIDE_INDEX.md) · [USER_GUIDE_STUDENT_SCHOOLS.md](./USER_GUIDE_STUDENT_SCHOOLS.md) · [../ADMISSION_NUMBER_FORMAT.md](../ADMISSION_NUMBER_FORMAT.md) · [../RECEIPT_BRANDING.md](../RECEIPT_BRANDING.md) · [../SCHOOL_FEES_PAYMENTS_REFERENCE.md](../SCHOOL_FEES_PAYMENTS_REFERENCE.md)
