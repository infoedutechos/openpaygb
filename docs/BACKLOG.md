# Product & engineering backlog

**Last updated:** 2026-07-19 · **Brand:** **OpenPayGB** · **Rails:** Mbiyo, LivePay, MoMo bridge · **Repo:** https://github.com/infoedutechos/ODELHUBPay

---

## Completed (school ERP pass 2026-07-12)

| ID | Item | Implementation |
|----|------|----------------|
| B-SCH-01 | Session-scoped enrollment | `SchoolSession`, `schoolSessionId` on students/classes |
| B-SCH-02 | Payment allocation | `PaymentAllocation` model + manual + online confirm hooks |
| B-SCH-03 | School ERP modules | Dashboard, session, accounts, structure, students/bills, defaulters, receipts, staff, outflow, inventory, reports, settings |
| B-SCH-04 | Results App import | `lib/school-results-app-import.ts`, external class/student import APIs |
| B-SCH-05 | School receipts API | `/api/admin/school/receipts` + export |
| B-SCH-06 | Seed school defaults | `provisionSchoolErpDefaults()` on org activation |
| B-SCH-07 | Accurate financial periods and inventory valuation | Inclusive date ranges for cash flow, P&L and expense reports; session/term salary scope; inventory unit cost and available-value reporting |
| B-OPS-06 | Master OPGB ops | `/admin/master/opgb-ops` — resolve P2P disputes (release/refund); withdraw queue (mark paid / reject+restore); withdraw no longer auto-completes |
| B-SCAN-01 | Deep scan 2026-07-16 | Cron truth, Mongo hot indexes, school ERP nav restore, Dex honesty, TMA multi-org + schools, demo P2P prod gate — [DEEP_SCAN_2026-07-16.md](./DEEP_SCAN_2026-07-16.md) |
| B-SCAN-02 | Deep scan 2026-07-19 | Idempotent payment confirms, MoMo timing-safe secret, dex-settle cron auth, Telegram token resolve, Help chrome, OpenPayGB sidebar/labels — [DEEP_SCAN_2026-07-19.md](./DEEP_SCAN_2026-07-19.md) |
| B-HELP-01 | Help Center Ask-anything workspace | `/help` → `HelpCenterWorkspace` (sidebar + Ready when you are) |
| B-MAC-03 | Hub hide + visitor per-page/actions | `#hub-visibility`, SiteVisitPath*/Action* models, VisitBeacon actions |
| B-MAC-01 | Master demo logins console | `/admin/master#demo-logins` + `GET/PATCH /api/master/demo-logins` + export + public `/api/public/demo-logins` — customise/publish/download all five demos; lobbies auto-update |
| B-MAC-02 | Full platform customisation | Branding (`#platform-branding`), auth/session policy (`#auth-session-policy`), cron ops (`#cron-ops`), hub maintenance + Developers hub + shared message; consumers: SEO, hero, footer, theme accent, session TTLs, pending payment TTL, manual confirm |
| B-SCH-08 | School terminology + SchoolPay-style School Code | Track labels **Day / Boarding** (was In-service / Regular), fee line labels **Fees / Other Requirements** (was tuition / functional) — display only, stored enums unchanged. `Organization.schoolPayCode` (6-digit, app-unique) + `GET /api/admin/school-pay-code` + `POST /api/public/school-code-lookup` + `/admin/students` code panel + `/pay` "Pay with School Code" quick lookup |

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
| B-REG-01 | School auto admin login | `schoolWorkspaceAutoGenerateAdminLogin` + `maybeProvisionSchoolOrgAdmin` on activate |
| B-REG-02 | School website favicon fetch | `registrationWebsiteUrl` + `fetchFaviconFromWebsite` on activate |
| B-COP-01 | ODEL HUB Copilot UX | Markdown article links, typeahead `/api/platform/chat/suggest`, no API disclaimers |
| B-DEP-01 | Production env autonomous sync | `deployment:provision-sync`, `DEPLOYMENT_ENV_PRODUCTION.md` |
| B-OPS-02 | Webhook secrets alignment | `webhooks:alignment-check`, `GET /api/public/webhook-alignment`, [WEBHOOK_SECRETS_ALIGNMENT.md](./WEBHOOK_SECRETS_ALIGNMENT.md) |
| B-OPS-04 | Telegram bot token Master + Vercel | `telegram:alignment-check`, `GET /api/public/telegram-config`, [TELEGRAM_BOT_DEPLOYMENT.md](./TELEGRAM_BOT_DEPLOYMENT.md) |
| B-BUILD-01 | Vercel Prisma client bundle fix | Split receipt ledger client imports — [VERCEL_BUILD_FAILURES.md](./VERCEL_BUILD_FAILURES.md) |
| B-UX-05b | Master org UI consolidation | Shared `components/admin/master-org/*` — table row + mobile card + resend on both |
| P4 | URA game routes `apiErrorResponse` | `npm run migrate:game-api-errors` — game/play + legacy admin routes hardened |
| P3 | OpenPayGB virtual card program | Investigation complete — closed-loop shipped; acquiring + LivePay issuing next ([VIRTUAL_CARD_INVESTIGATION.md](./VIRTUAL_CARD_INVESTIGATION.md)) |
| B-UX-12 | Ledger receipts + school units | TEAM UNIVERSITY ledger format; `OrganizationUnitKind` registration; [LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md](./LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md) |
| B-UX-13 | Master settings mobile cards | KB, communications, OpenPay registry — `lg` card/table split |
| B-UX-14 | Master org unit column | Unit type + parent on approval table/cards; `GET /api/master/organizations` |
| B-TMA-08 | TMA admin mobile-safe deep-links | `TmaApp` tab panels → `/admin/students`, `/admin/master/organizations`, etc. |

---

## Remaining / operational

| ID | Item | Notes |
|----|------|-------|
| B-OPS-01 | Production env | [PRODUCTION_GO_LIVE.md](./PRODUCTION_GO_LIVE.md) |
| B-OPS-05 | Vercel deployment account gate | **Resolved 2026-07-16** — production CLI deploy READY and aliased to `https://odelpay.vercel.app`; commit/push local holistic fix tree so GitHub CI matches production |
| B-OPS-03 | PSP dashboard paste | After `deployment:provision-sync`, paste `MBIYO_*` / `MOMO_*` / `LIVEPAY_*` webhook secrets into each provider dashboard ([WEBHOOK_SECRETS_ALIGNMENT.md](./WEBHOOK_SECRETS_ALIGNMENT.md)) |
| P4 | LivePay KES/GHS/XAF checkout | Stub only until LivePay product expansion — use **Mbiyo** multi-country collect when configured |
| P3 | Card acquiring on checkout | Flutterwave/Paystack hosted pay — new `PaymentRail.card` (needs merchant account + settlement policy) |
| P3 | LivePay card issuing API | Request docs/sandbox from LivePay; see investigation §6 Phase 2 |
| P5 | Live on-chain delivery + PSP payout APIs | Custodial withdraw queue + master dispute resolve **shipped** (`/admin/master/opgb-ops`). Remaining: hot-wallet TON send + LivePay/Relworx `send-money` once payout credentials exist |

---

## Verification

```powershell
npm run db:push
npm run db:generate
npm run verify
```
