# Product & engineering backlog

**Last updated:** 2026-06-03 · **Brand:** **OpenPayGB** · **Rails:** Mbiyo, LivePay

---

## Completed (holistic pass 2026-06-04)

| ID | Item | Implementation |
|----|------|----------------|
| B-UX-01 | Admin global search | `GET /api/admin/search`, `AdminWorkspaceBar` + `AdminGlobalSearch` in `TuitionAdminShell` |
| B-UX-02 | Master `?orgSlug=` sync | `useMasterOrgSlug`, nav links, students/payments/reports/dashboard |
| B-UX-03 | Reports tenant scope | Reports → `GET /api/admin/summary?organizationSlug=` |
| B-UX-04 | Applicant status page | `/school/workspace-status` + `GET /api/public/workspace-status`; verify redirects here |
| B-UX-05 | Master org admin UI | `sendInviteEmail` checkbox; mobile/desktop split unchanged (cards vs table) |
| B-UX-06 | Org admin user management | `POST /api/admin/org-users` + `AdminUsersInvitePanel` on `/admin/users` |
| B-UX-07 | Student LivePay + brand | `startStudentLivepay`, livepay UI, OpenPayGB copy |
| B-SEC-01 | Invite reset link | Org admin invite emails password-set link only |
| B-SEC-02 | Distributed rate limits | `lib/rate-limit-distributed.ts` (Upstash optional) |
| B-SEC-03 | Split JWT secrets | `lib/jwt-secrets.ts` + env aliases |
| B-SEC-04 | apiErrorResponse | master admins, livepay webhook |
| B-SEC-05 | Partner webhook retry | 3 attempts with backoff in `lib/partner-webhooks.ts` |
| B-SEC-06 | Notifications auth | Already gated — documented in `DUAL_ADMIN_AUTH.md` |
| B-DEBT-01 | Legacy collect | `410` via `lib/api-deprecation.ts` |
| B-DEBT-02 | Dual admin auth doc | `docs/DUAL_ADMIN_AUTH.md` |
| B-DEBT-03 | LivePay multi-country stub | `lib/livepay/supported-countries.ts` |
| B-DEBT-04 | Branding copy | dex, master page, mbiyo-checkout-form |
| B-DEBT-06 | Holistic audit | LivePay status corrected |
| B-UX-08 | User profile + last login | `lastLoginAt` / `previousLoginAt` on `AdminUser` + `Student`; `/api/auth/me`, `/api/student/me`; `UserProfilePanel`, `/my/profile`, admin Settings |
| B-UX-09 | Welcome back (all roles) | `WelcomeBackStrip` in admin/master/student shells; `GuestWelcomeBanner` in PayWizard (localStorage last visit) |
| B-UX-05b-fix | Resend workspace verify | Wired `resendVerification` on Master → Organizations table |

---

| B-UX-10 | Password in profile (all roles) | Removed sidebar Password links; `/my/profile#password`, `/admin/profile`, master overview profile section |
| B-UX-11 | Social icon CORB fix | Same-origin `/api/notification-social-icon` — no `cdn.simpleicons.org` |
| B-DEV-01 | Dev console noise | Suppress Fast Refresh / webpack-hmr / OpaqueResponseBlocking in `tonconnect-console-quiet-install`; dev CSP allows `ws:` |
| B-TMA-01 | Telegram Mini App | `/tma` student/admin/master UI; bot landing + reply keyboard; `POST /api/tma/session`; see [TELEGRAM_MINI_APP.md](./TELEGRAM_MINI_APP.md) |
| B-TMA-02 | In-TMA checkout | `TmaPayFlow` — OpenPay card + LivePay MoMo + TON link |
| B-TMA-03 | In-TMA receipts | `GET /api/tma/receipts`, `TmaReceipts` PDF + share |
| B-TMA-04 | Admin telegramId | `AdminUser.telegramId` + `scripts/link-admin-telegram.ts` |
| B-TMA-05 | Bot notification templates | `lib/telegram/templates.ts` — payment, receipt, card top-up, due reminders |
| B-TMA-06 | Tuition due cron | `GET /api/cron/telegram-tuition-reminders` |
| B-TMA-07 | Menu button script | `npm run telegram:set-menu` |
| B-DB-01 | Prisma schema push | `lastLoginAt` fields — run `npm run db:push` on each environment |

---

## Remaining / operational

| ID | Item | Notes |
|----|------|-------|
| B-OPS-01 | Production env | [PRODUCTION_GO_LIVE.md](./PRODUCTION_GO_LIVE.md) |
| B-UX-05b | Master org UI consolidation | Optional: single `MasterOrgRow` component for table + card (low priority) |
| P4 | URA game routes `apiErrorResponse` | Out of tuition scope (~200 routes) |
| P4 | LivePay KES/GHS/XAF checkout | Stub only until LivePay product expansion |
| P3 | OpenPayGB virtual card program | Investigation: [VIRTUAL_CARD_INVESTIGATION.md](./VIRTUAL_CARD_INVESTIGATION.md) — pick issuing vs acquiring vs closed-loop; request LivePay card API docs |

---

## Verification

```powershell
npm run db:push
npm run db:generate
npm run verify
```
