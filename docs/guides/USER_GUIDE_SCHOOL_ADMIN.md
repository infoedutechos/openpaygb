# User Guide: School Admin (`org_admin`)

## Who this is for

This guide is for institution staff managing one school workspace in ODEL HUB Pay. Your account is scoped to your organization and you operate the Tuition Hub.

Primary entry:

- `/school/login` (redirects to `/admin/login?school=1`)
- Main workspace: `/admin`

## Tuition Hub sidebar

Defined in `components/admin/TuitionAdminShell.tsx`.

| Sidebar item | Route | Purpose |
|---|---|---|
| Dashboard | `/admin` | School summary and quick actions |
| Tuition balance | `/admin/tuition-balance` | Student paid vs outstanding + progress/installments |
| Students | `/admin/students` | Student records and profile-level actions |
| Payments | `/admin/payments` | Payment list, status tracking, reconciliation |
| Virtual cards | `/admin/virtual-cards` | Card records for student virtual cards |
| Programs | `/admin/programmes` | Programme and fee schedule management |
| Receipts | `/admin/receipts` | Receipt lookup and output management |
| Reports | `/admin/reports` | Tuition and operational reporting |
| Users | `/admin/users` | Workspace user/account admin |
| Settings | `/admin/settings` | Password and school-specific settings |

Also available:

- Dashboard chat button (tuition support assistant).
- Logout action in shell.

## Login and first access

1. Open `/school/login`.
2. Confirm "School admin" mode is selected.
3. Enter the credentials issued by platform operations.
4. You are redirected to `/admin` (or safe `next` route).
5. Verify school label at top of the shell matches your institution.

If your school was newly registered, ensure workspace approval and admin account creation are complete before first login.

## Day-to-day task flows

## 1) Dashboard review

1. Open `/admin`.
2. Check recent collections and operational widgets.
3. Verify no workspace email verification or DB degraded banners are active.
4. Use quick links for students/payments/programmes.

## 2) Manage student records

1. Go to `/admin/students`.
2. Search by name, email, phone, programme code.
3. Open student detail (`/admin/students/[id]`) for deep edits.
4. Update profile fields as needed.
5. If portal claim/sign-in support is needed, set/reset portal password via student actions.

Supporting APIs:

- `GET/POST /api/students`
- `GET /api/students/[id]`
- `PATCH /api/students/[id]/portal-password`

## 3) Maintain programmes and fee schedules

1. Open `/admin/programmes`.
2. Create or edit programme code/name and track.
3. Add fee lines per year/semester/recurrence.
4. Validate total tuition + functional fees for each period.
5. Re-test quote/checkout with the affected programme.

Related APIs:

- `GET/POST /api/admin/programmes`
- `PATCH/DELETE /api/admin/programmes/[id]`
- `POST /api/admin/programmes/[id]/fees`
- `PATCH/DELETE /api/admin/programmes/[id]/fees/[feeId]`

## 4) Tuition balance management

1. Open `/admin/tuition-balance`.
2. Search by student/programme and sort outstanding amounts.
3. Expand "Balance panel" to inspect:
   - context-level outstanding amounts
   - installment next due index
   - per-period progress
4. Open student record from the same row for direct follow-up.

Source endpoint:

- `GET /api/admin/tuition-balances`

## 5) Payments operations and reconciliation

1. Open `/admin/payments`.
2. Filter by status, rail, date, student.
3. Inspect pending/failed payment rows.
4. Confirm webhook-driven status transitions are occurring.
5. Handle cancellations/refunds according to school policy.

Core payment APIs:

- `GET/POST /api/payments`
- `GET/PATCH /api/payments/[id]`
- `POST /api/payments/[id]/cancel`
- `POST /api/payments/[id]/refund`

## 6) Receipts and reporting

1. Open `/admin/receipts` for receipt navigation.
2. Use payment id to open receipt detail.
3. Download/share PDF where needed.
4. Open `/admin/reports` for summary exports and operational reporting.

Receipt APIs:

- `GET /api/receipts/[paymentId]`
- `GET /api/receipts/[paymentId]/pdf`

## 7) Virtual cards in school operations

1. Open `/admin/virtual-cards`.
2. Review card status and balance trends.
3. Assist students with activation/funding issues.
4. Confirm card rail appears in payment history as `openpay_card`.

## 8) Users and settings

1. Open `/admin/users` to maintain workspace users.
2. Open `/admin/settings` for password/security operations.
3. Rotate passwords for compromised accounts immediately.

## Fee and tuition governance best practices

- Keep programme duration and semester structure aligned with fee rows.
- Avoid overlapping fee lines unless intentionally distinct (`feeKey`).
- Reconcile outstanding balances weekly.
- Monitor installment plans with overdue "next due" slices.
- Keep student email accuracy high for receipt and claim workflows.

## Working with student portal and guest pay

School admins often support these user journeys:

- Student sign-in: `/student/login`.
- New student registration: `/student/register`.
- Guest-to-portal claim: `/student/claim`.
- Guest checkout by school slug: `/pay/[orgSlug]`.

When a student says "I paid but cannot see it":

1. Verify payment status in admin payments.
2. Confirm they used correct school slug and email.
3. Direct to `/student/claim` if they paid as guest and need portal access.
4. Confirm receipt at `/receipt/[paymentId]`.

## Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| Cannot access `/admin` | Session expired or wrong role | Re-login via `/school/login` |
| Student not found in balance list | Filter too narrow or wrong school context | Clear search and verify workspace |
| Balance appears higher than expected | Fee rows changed after prior payments | Review programme fee history and payment contexts |
| Payment remains pending | Rail callback not received | Check webhook route/secrets with platform master |
| Student cannot login | No portal password set | Set portal password from student tools |
| Guest cannot claim account | Email/school mismatch from checkout | Validate original checkout email and org slug |

## Escalation to platform master

Escalate when you need:

- Tenant-level destination wallet or processing fee changes.
- Rail credential/webhook secret updates.
- Environment variable or deployment fixes.
- Partner API key provisioning.
- Organization-level approval/status adjustments.

Master console route for escalation target:

- `/admin/master`
