# Product & engineering backlog

**Last updated:** 2026-09-04 · **Brand:** **OpenPayGB** · **Rails:** Mbiyo, LivePay, Relworx, VixonPay, MoMo bridge · **Repo:** https://github.com/infoedutechos/ODELHUBPay

**Sep 2026 pack:** [PLATFORM_UPDATE_2026-09.md](../platform/PLATFORM_UPDATE_2026-09.md) · Maturity: [OPENPAYGB_GATEWAY_MATURITY.md](../platform/OPENPAYGB_GATEWAY_MATURITY.md) · Uwais roadmap: [UWAIS_SMIS_PRIORITY_ROADMAP.md](../platform/UWAIS_SMIS_PRIORITY_ROADMAP.md)

---

## Completed (OPGB merchant + Uwais / school pass 2026-09)

| ID | Item | Implementation |
|----|------|----------------|
| B-OPGB-M1 | Merchant charges + hosted checkout | `POST /api/partner/v1/charges`, `/opgb/checkout/[id]`, fee engine, white-label |
| B-OPGB-M2 | Merchant settlement + cashout queue | `DeveloperApp.settlementBalanceUgx`, `MerchantPayout`, developers `#settlement`, master mark-paid |
| B-OPGB-M3 | Charge webhook retry | 3× backoff in `lib/merchant-charge-webhooks.ts` (parity with payment webhooks) |
| B-OPGB-M4 | Sandbox auto-cashout | `OPENPAYGB_CASHOUT_SANDBOX` / charges sandbox → `tryAutoDisburseMerchantPayout` |
| B-OPGB-M5 | Holistic OPGB master console | `/admin/master/opgb-ops` multi-tab (fees, charges, cashouts, cards, withdraws) |
| B-SCH-U1 | Uwais fee ledger + CSV import | `/admin/fee-ledger`, `npm run seed:uwais`, sample CSV |
| B-SCH-U2 | Parent portal + `/pay/uwais` | `/parent`, public pay slug |
| B-SCH-U3 | Cashbook + bank deposits | `/admin/school-cashbook`, `SchoolCashbookDeposit` |
| B-SCH-U4 | School-as-merchant settlement | `/admin/school-settlement` (+ test charge / Telegram reminders actions) |
| B-SCH-U5 | SMIS DB-backed pilots | `SchoolSmisEntry` + `/api/admin/school/smis` (attendance/quran/exams/audit) — not localStorage |
| B-AUTH-01 | School login hardening | `/admin/login?school=1` Uwais prefill, clear URA cookies, `?school=1` redirects |
| B-AUTH-01b | Schools remember-email + post-login | Separate LS key; org_admin lands on `/admin/school-dashboard` |
| B-P5-01 | LivePay/Relworx send-money | `lib/momo-disburse.ts` wired into merchant cashout auto-disburse |
| B-SCH-R1b | SMS/WhatsApp reminder adapters | `lib/sms/send.ts` + multi-channel fee-reminders API |
| B-P3-01 | Card acquiring start | `PaymentRail.card` + `/api/public/checkout/card-start` |
| B-SCH-R3b | Attendance class roster | `SchoolAttendanceRoster` on `/admin/school-attendance` |
| B-CARD-MOMO | Platform card MoMo activate/fund | Sandbox + any-one live rail; `openpay-card-momo-config` |
| B-MAC-UG-MOMO | Master Uganda MoMo keys panel | `/admin/master#ug-momo-credentials` (LivePay/Relworx/VixonPay) |

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
| B-SCAN-03 | A+ money + TMA + UI close-out | Refund reverses allocations/OpenPayGB; school alloc `$transaction`; TMA fee quotes; hub-hide dock; delete HelpCenterBrowse; admin OpenPay holder APIs |
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
| B-DEBT-02 | Dual admin auth doc | `docs/operations/DUAL_ADMIN_AUTH.md` |
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
| B-TMA-01 | Telegram Mini App | `/tma` student/admin/master UI; bot landing + reply keyboard; `POST /api/tma/session`; see [TELEGRAM_MINI_APP.md](../deployment/TELEGRAM_MINI_APP.md) |
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
| B-OPS-02 | Webhook secrets alignment | `webhooks:alignment-check`, `GET /api/public/webhook-alignment`, [WEBHOOK_SECRETS_ALIGNMENT.md](../deployment/WEBHOOK_SECRETS_ALIGNMENT.md) |
| B-OPS-04 | Telegram bot token Master + Vercel | `telegram:alignment-check`, `GET /api/public/telegram-config`, [TELEGRAM_BOT_DEPLOYMENT.md](../deployment/TELEGRAM_BOT_DEPLOYMENT.md) |
| B-BUILD-01 | Vercel Prisma client bundle fix | Split receipt ledger client imports — [VERCEL_BUILD_FAILURES.md](../deployment/VERCEL_BUILD_FAILURES.md) |
| B-UX-05b | Master org UI consolidation | Shared `components/admin/master-org/*` — table row + mobile card + resend on both |
| P4 | URA game routes `apiErrorResponse` | `npm run migrate:game-api-errors` — game/play + legacy admin routes hardened |
| P3 | OpenPayGB virtual card program | Investigation complete — closed-loop shipped; acquiring + LivePay issuing next ([VIRTUAL_CARD_INVESTIGATION.md](../platform/VIRTUAL_CARD_INVESTIGATION.md)) |
| B-UX-12 | Ledger receipts + school units | TEAM UNIVERSITY ledger format; `OrganizationUnitKind` registration; [LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md](../school/LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md) |
| B-UX-13 | Master settings mobile cards | KB, communications, OpenPay registry — `lg` card/table split |
| B-UX-14 | Master org unit column | Unit type + parent on approval table/cards; `GET /api/master/organizations` |
| B-TMA-08 | TMA admin mobile-safe deep-links | `TmaApp` tab panels → `/admin/students`, `/admin/master/organizations`, etc. |

---

## Remaining / operational

| ID | Pri | Item | Status | Notes |
|----|-----|------|--------|-------|
| B-OPS-01 | P1 | Production env / go-live | Partial | [PRODUCTION_GO_LIVE.md](../deployment/PRODUCTION_GO_LIVE.md) |
| B-OPS-03 | P0 | PSP dashboard paste | Ops | Paste `MBIYO_*` / `MOMO_*` / `LIVEPAY_*` webhook secrets after provision-sync |
| B-OPS-07 | P1 | Production `db:push` | Ops | Include SMIS / cashbook deposit / fee-reminder collections + `PaymentRail.card` after deploy |
| B-OPS-08 | P2 | Upstash rate limits | Missing | `UPSTASH_REDIS_REST_URL` + `TOKEN` on Vercel |
| P5 | P0 | Live PSP **send-money** (merchant cashout + custodial withdraw) | **Done (auto)** | Live when LivePay/Relworx configured; `OPENPAYGB_CASHOUT_LIVE=0` forces queue-only. Fund PSP float in production. |
| P3a | P1 | Bank Visa/MC **acquiring** | **Done (code)** | `card-start` + Flutterwave/Paystack webhooks + PayWizard; set acquirer keys. |
| P3b | P1 | LivePay / Visa **network issuing** | **Scaffold** | [CARD_ISSUING.md](../platform/CARD_ISSUING.md) — VDP mTLS + LivePay URL; BIN sponsor for live PANs. |
| P5b | P1 | Hot-wallet on-chain TON delivery | Missing | Dex Phase 5 — custodial ops desk already live |
| P4 | P2 | LivePay KES/GHS/XAF | Stub | Only UG implemented — use Mbiyo multi-country when configured |
| B-SCH-R1 | P1 | SMS/WhatsApp fee reminders | **Code done** | `lib/sms/send.ts` + fee-reminders channels; needs Africa’s Talking / WhatsApp env |
| B-SCH-R2 | P1 | Real Uwais production spreadsheet import | Partial | Sample CSV path live — replace with full sheet for “Excel is backup” exit |
| B-SCH-R3 | P2 | SMIS domain depth (class attendance / Qur’an grades) | **Partial→improved** | Class roster attendance (`SchoolAttendanceRoster`) + SMIS log; Qur’an/exams still generic rows |
| B-SCH-R4 | P3 | Payroll / timetable / library / transport / parent app | Missing | Explicitly deferred in Uwais roadmap P3 |
| B-DB-02 | P2 | Unique `admissionNo` / `schoolPayCode` after data cleanup | Partial | `npm run db:dedupe-codes` (`scripts/dedupe-admission-school-codes.ts`); Mongo `@@unique` still deferred until every env runs dedupe |
| B-AUTH-01b | P1 | School login remember-email isolation | **Done** | Separate `odelhub_admin_email_schools`; org_admin → `/admin/school-dashboard` |

### Recommended next 5 (impact × feasibility)

1. Paste PSP collect keys + webhook secrets; fund float (cashout auto when rails configured)  
2. Configure Flutterwave or Paystack + webhook URLs for bank card  
3. Configure Africa’s Talking for SMS fee reminders  
4. Wire Visa Developer certs / LivePay issuing URL ([CARD_ISSUING.md](../platform/CARD_ISSUING.md))  
5. Import real Uwais spreadsheet end-to-end  

---

## Verification

```powershell
npm run db:push
npm run db:generate
npm run verify
# optional cleanup before unique indexes:
npm run db:dedupe-codes
```

**School admin (Uwais):** `/admin/login?school=1` → email from `SEED_UWAIS_ADMIN_EMAIL` (default `uwais.admin@odelhub.local`) and password printed by `npm run seed:uwais`.