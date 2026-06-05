# UI vs codebase

This file is **generated** by `npm run docs:inventory`. It compares App Router **pages** to **API route handlers** and calls out integration-only routes.

## Regenerate

```bash
npm run docs:tree:write   # optional: refresh ASCII tree → docs/FOLDER_TREE_SNAPSHOT.txt
npm run docs:inventory   # writes API_INVENTORY.csv, UI_ROUTES.csv, and this file
```

## Exported machine-readable inventories

| File | Contents |
|------|-----------|
| [API_INVENTORY.csv](./API_INVENTORY.csv) | Every `app/api/**/route.ts` URL, file path, exported HTTP methods |
| [UI_ROUTES.csv](./UI_ROUTES.csv) | Every `app/**/page.tsx` UI path and file path |

## Public / pay UI → typical APIs

| UI route | Typical or dedicated APIs |
|----------|---------------------------|
| / | (marketing shell; may call /api/programmes, /api/fx/rate from client) |
| /pay | /api/programmes, /api/programmes/[code]/quote, /api/public/checkout/student, /api/public/checkout/payment, /api/public/checkout/ton-pay-transfer, /api/payments/[id]/public, /api/payments, /api/payments/[id], /api/manifest/tonconnect, /api/collect/momo |
| /pay/[orgSlug] | /api/programmes, /api/programmes/[code]/quote, /api/public/checkout/student, /api/public/checkout/payment, /api/public/checkout/ton-pay-transfer, /api/payments/[id]/public, /api/payments, /api/payments/[id], /api/manifest/tonconnect, /api/collect/momo |
| /receipt/[paymentId] | /api/receipts/[paymentId], /api/receipts/[paymentId]/pdf |
| /clicker | (URA Telegram mini-app shell; uses `components/*`, `utils/consts` `WALLET_MANIFEST_URL`, TonConnect in `app/clicker/layout.tsx`) |

## Admin UI → API coverage

| UI route | Mapped API paths (under `app/api`) | Match |
|----------|----------------------------------------|-------|
| /admin | /api/admin/summary | yes |
| /admin/accounts | /api/admin/accounts | yes |
| /admin/bot-users | /api/admin/bot-users/[id]<br>/api/admin/bot-users<br>/api/admin/bot-users/weekly-top | yes |
| /admin/cards | /api/admin/cards | yes |
| /admin/daily-cipher | /api/admin/daily-cipher | yes |
| /admin/daily-combo | /api/admin/daily-combo | yes |
| /admin/daily-pattern | /api/admin/daily-pattern | yes |
| /admin/export | /api/admin/export | yes |
| /admin/fees-collection | /api/admin/fees-collection | yes |
| /admin/global-tasks | /api/admin/global-tasks | yes |
| /admin/league-management | /api/admin/league-management | yes |
| /admin/learn | /api/admin/learn | yes |
| /admin/login | /api/admin/login<br>/api/admin/logout | yes — Logout is POST-only; login uses `/api/admin/login`. |
| /admin/master | (none under /api/admin/master/) | no |
| /admin/master/organizations | (none under /api/admin/master/) | no |
| /admin/master/programmes | (none under /api/admin/master/) | no |
| /admin/milestone-banners | /api/admin/milestone-banners/[id]<br>/api/admin/milestone-banners | yes |
| /admin/notifications | /api/admin/notifications/[id]/recall<br>/api/admin/notifications/[id]<br>/api/admin/notifications<br>/api/admin/notifications/upload | yes — Middleware allows this path with URA `admin_session` cookie (see `middleware.ts`). |
| /admin/onchain-tasks | /api/admin/onchain-tasks/[id]<br>/api/admin/onchain-tasks | yes |
| /admin/payments | /api/payments<br>/api/payments/[id]<br>/api/payments/export | yes — Payments under `/api/payments`; CSV export at `/api/payments/export`. |
| /admin/pearls | /api/admin/pearls | yes |
| /admin/programmes | /api/admin/programmes/[id]/fees/[feeId]<br>/api/admin/programmes/[id]/fees<br>/api/admin/programmes/[id]<br>/api/admin/programmes/import<br>/api/admin/programmes | yes |
| /admin/published-activities | /api/admin/published-activities/[id]<br>/api/admin/published-activities | yes |
| /admin/quiz | /api/admin/quiz | yes |
| /admin/receipts | (none under /api/admin/receipts/) | no |
| /admin/register | (none under /api/admin/register/) | no |
| /admin/reports | (none under /api/admin/reports/) | no |
| /admin/reset-password | (none under /api/admin/reset-password/) | no |
| /admin/settings | (none under /api/admin/settings/) | no |
| /admin/shop | /api/admin/shop/products<br>/api/admin/shop/settings | yes |
| /admin/staking-audit | /api/admin/staking-audit | yes |
| /admin/students | /api/students | yes — Student APIs under `/api/students`, not `/api/admin/students`. |
| /admin/students/[id] | /api/students/[id] | yes — Student APIs under `/api/students`, not `/api/admin/students`. |
| /admin/tasks | /api/admin/tasks/[id]<br>/api/admin/tasks | yes |
| /admin/telegram-broadcast | /api/admin/telegram-broadcast | yes |
| /admin/users | (none under /api/admin/users/) | no |
| /admin/weekly-event | /api/admin/weekly-event | yes |

## `/api/*` routes outside `/api/admin/*`

These handlers are not namespaced under `/api/admin/`. Several are still used from **admin** pages (e.g. `/admin/payments` → `/api/payments`, `/admin/students` → `/api/students`). Others are **integration-only** (cron, webhooks, TON manifest) or **public pay**.

- `/api/auth/admin/change-password` — `app/api/auth/admin/change-password/route.ts`
- `/api/auth/forgot-password` — `app/api/auth/forgot-password/route.ts`
- `/api/auth/google/student/callback` — `app/api/auth/google/student/callback/route.ts`
- `/api/auth/google/student` — `app/api/auth/google/student/route.ts`
- `/api/auth/login` — `app/api/auth/login/route.ts`
- `/api/auth/logout` — `app/api/auth/logout/route.ts`
- `/api/auth/me` — `app/api/auth/me/route.ts`
- `/api/auth/reset-password` — `app/api/auth/reset-password/route.ts`
- `/api/auth/setup-hint` — `app/api/auth/setup-hint/route.ts`
- `/api/auth/student-claim-portal` — `app/api/auth/student-claim-portal/route.ts`
- `/api/auth/student-login` — `app/api/auth/student-login/route.ts`
- `/api/auth/student-logout` — `app/api/auth/student-logout/route.ts`
- `/api/auth/student-signup/complete` — `app/api/auth/student-signup/complete/route.ts`
- `/api/auth/student-signup/request` — `app/api/auth/student-signup/request/route.ts`
- `/api/auth/student-signup/session` — `app/api/auth/student-signup/session/route.ts`
- `/api/auth/student-signup/verify` — `app/api/auth/student-signup/verify/route.ts`
- `/api/auth/student/change-password` — `app/api/auth/student/change-password/route.ts`
- `/api/cards` — `app/api/cards/route.ts`
- `/api/collect/mbiyo` — `app/api/collect/mbiyo/route.ts`
- `/api/collect/momo` — `app/api/collect/momo/route.ts`
- `/api/cron/confirm-ton` — `app/api/cron/confirm-ton/route.ts`
- `/api/cron/expire-pending-payments` — `app/api/cron/expire-pending-payments/route.ts`
- `/api/daily-cipher` — `app/api/daily-cipher/route.ts`
- `/api/daily-combo` — `app/api/daily-combo/route.ts`
- `/api/daily-reward` — `app/api/daily-reward/route.ts`
- `/api/donate` — `app/api/donate/route.ts`
- `/api/donations/leaderboard` — `app/api/donations/leaderboard/route.ts`
- `/api/fx/rate` — `app/api/fx/rate/route.ts`
- `/api/global-tasks/[id]/invite` — `app/api/global-tasks/[id]/invite/route.ts`
- `/api/global-tasks/[id]/join` — `app/api/global-tasks/[id]/join/route.ts`
- `/api/global-tasks/challenges/[challengeId]/accept` — `app/api/global-tasks/challenges/[challengeId]/accept/route.ts`
- `/api/global-tasks/challenges` — `app/api/global-tasks/challenges/route.ts`
- `/api/global-tasks` — `app/api/global-tasks/route.ts`
- `/api/guild/overview` — `app/api/guild/overview/route.ts`
- `/api/health` — `app/api/health/route.ts`
- `/api/league-challenges/[id]/accept` — `app/api/league-challenges/[id]/accept/route.ts`
- `/api/league-challenges/[id]/contribute` — `app/api/league-challenges/[id]/contribute/route.ts`
- `/api/league-challenges/[id]` — `app/api/league-challenges/[id]/route.ts`
- `/api/league-challenges` — `app/api/league-challenges/route.ts`
- `/api/leagues/[id]/manage/opinions/[opinionId]/vote` — `app/api/leagues/[id]/manage/opinions/[opinionId]/vote/route.ts`
- `/api/leagues/[id]/manage` — `app/api/leagues/[id]/manage/route.ts`
- `/api/leagues/[id]/requests` — `app/api/leagues/[id]/requests/route.ts`
- `/api/leagues/[id]` — `app/api/leagues/[id]/route.ts`
- `/api/leagues/by-code` — `app/api/leagues/by-code/route.ts`
- `/api/leagues/join-as-team` — `app/api/leagues/join-as-team/route.ts`
- `/api/leagues/join` — `app/api/leagues/join/route.ts`
- `/api/leagues/list` — `app/api/leagues/list/route.ts`
- `/api/leagues/my-requests` — `app/api/leagues/my-requests/route.ts`
- `/api/leagues/request` — `app/api/leagues/request/route.ts`
- `/api/leagues` — `app/api/leagues/route.ts`
- `/api/learn/categories` — `app/api/learn/categories/route.ts`
- `/api/license` — `app/api/license/route.ts`
- `/api/manifest/tonconnect` — `app/api/manifest/tonconnect/route.ts`
- `/api/marketplace/buy` — `app/api/marketplace/buy/route.ts`
- `/api/marketplace/listings/[id]/cancel` — `app/api/marketplace/listings/[id]/cancel/route.ts`
- `/api/marketplace/listings` — `app/api/marketplace/listings/route.ts`
- `/api/marketplace/me` — `app/api/marketplace/me/route.ts`
- `/api/master/admins` — `app/api/master/admins/route.ts`
- `/api/master/backup/restore` — `app/api/master/backup/restore/route.ts`
- `/api/master/backup` — `app/api/master/backup/route.ts`
- `/api/master/backup/status` — `app/api/master/backup/status/route.ts`
- `/api/master/fx` — `app/api/master/fx/route.ts`
- `/api/master/mobile-money-providers/[id]` — `app/api/master/mobile-money-providers/[id]/route.ts`
- `/api/master/mobile-money-providers` — `app/api/master/mobile-money-providers/route.ts`
- `/api/master/organizations/[id]/checkout-platform-fee` — `app/api/master/organizations/[id]/checkout-platform-fee/route.ts`
- `/api/master/organizations/[id]/destination-wallet` — `app/api/master/organizations/[id]/destination-wallet/route.ts`
- `/api/master/organizations/[id]/favicon` — `app/api/master/organizations/[id]/favicon/route.ts`
- `/api/master/organizations/[id]/fx` — `app/api/master/organizations/[id]/fx/route.ts`
- `/api/master/organizations/[id]` — `app/api/master/organizations/[id]/route.ts`
- `/api/master/organizations` — `app/api/master/organizations/route.ts`
- `/api/master/partner/keys/[id]` — `app/api/master/partner/keys/[id]/route.ts`
- `/api/master/partner/keys` — `app/api/master/partner/keys/route.ts`
- `/api/master/partner/webhooks/[id]` — `app/api/master/partner/webhooks/[id]/route.ts`
- `/api/master/partner/webhooks` — `app/api/master/partner/webhooks/route.ts`
- `/api/master/platform-checkout-fee` — `app/api/master/platform-checkout-fee/route.ts`
- `/api/master/programmes/[id]` — `app/api/master/programmes/[id]/route.ts`
- `/api/master/programmes/apply-inferred` — `app/api/master/programmes/apply-inferred/route.ts`
- `/api/master/programmes` — `app/api/master/programmes/route.ts`
- `/api/master/school-workspace-registration` — `app/api/master/school-workspace-registration/route.ts`
- `/api/master/site-ui/logo` — `app/api/master/site-ui/logo/route.ts`
- `/api/master/site-ui` — `app/api/master/site-ui/route.ts`
- `/api/master/site-ui/social-icon/[key]` — `app/api/master/site-ui/social-icon/[key]/route.ts`
- `/api/master/summary` — `app/api/master/summary/route.ts`
- `/api/milestone-banner` — `app/api/milestone-banner/route.ts`
- `/api/mini-games` — `app/api/mini-games/route.ts`
- `/api/notifications` — `app/api/notifications/route.ts`
- `/api/onchain-tasks/check` — `app/api/onchain-tasks/check/route.ts`
- `/api/onchain-tasks` — `app/api/onchain-tasks/route.ts`
- `/api/org/[slug]/favicon` — `app/api/org/[slug]/favicon/route.ts`
- `/api/partner/v1/organizations` — `app/api/partner/v1/organizations/route.ts`
- `/api/partner/v1/payments/[id]` — `app/api/partner/v1/payments/[id]/route.ts`
- `/api/partner/v1/payments` — `app/api/partner/v1/payments/route.ts`
- `/api/payments/[id]/cancel` — `app/api/payments/[id]/cancel/route.ts`
- `/api/payments/[id]/public` — `app/api/payments/[id]/public/route.ts`
- `/api/payments/[id]/refund` — `app/api/payments/[id]/refund/route.ts`
- `/api/payments/[id]` — `app/api/payments/[id]/route.ts`
- `/api/payments/export` — `app/api/payments/export/route.ts`
- `/api/payments` — `app/api/payments/route.ts`
- `/api/pearls/activity` — `app/api/pearls/activity/route.ts`
- `/api/pearls/buy` — `app/api/pearls/buy/route.ts`
- `/api/pearls/convert` — `app/api/pearls/convert/route.ts`
- `/api/pearls/me` — `app/api/pearls/me/route.ts`
- `/api/pearls/sell` — `app/api/pearls/sell/route.ts`
- `/api/pearls/swap` — `app/api/pearls/swap/route.ts`
- `/api/pearls/transfer` — `app/api/pearls/transfer/route.ts`
- `/api/pearls/withdraw` — `app/api/pearls/withdraw/route.ts`
- `/api/platform/logo` — `app/api/platform/logo/route.ts`
- `/api/programmes/[code]/quote` — `app/api/programmes/[code]/quote/route.ts`
- `/api/programmes` — `app/api/programmes/route.ts`
- `/api/public/checkout/balance` — `app/api/public/checkout/balance/route.ts`
- `/api/public/checkout/livepay-start` — `app/api/public/checkout/livepay-start/route.ts`
- `/api/public/checkout/mbiyo-start` — `app/api/public/checkout/mbiyo-start/route.ts`
- `/api/public/checkout/payment/[id]/cancel` — `app/api/public/checkout/payment/[id]/cancel/route.ts`
- `/api/public/checkout/payment` — `app/api/public/checkout/payment/route.ts`
- `/api/public/checkout/session` — `app/api/public/checkout/session/route.ts`
- `/api/public/checkout/student` — `app/api/public/checkout/student/route.ts`
- `/api/public/checkout/ton-pay-transfer` — `app/api/public/checkout/ton-pay-transfer/route.ts`
- `/api/public/livepay-config` — `app/api/public/livepay-config/route.ts`
- `/api/public/organization-register/resend` — `app/api/public/organization-register/resend/route.ts`
- `/api/public/organization-register` — `app/api/public/organization-register/route.ts`
- `/api/public/organization-register/verify` — `app/api/public/organization-register/verify/route.ts`
- `/api/public/organizations` — `app/api/public/organizations/route.ts`
- `/api/public/school-workspace-registration-policy` — `app/api/public/school-workspace-registration-policy/route.ts`
- `/api/public/site-ui` — `app/api/public/site-ui/route.ts`
- `/api/public/social-icon/[key]` — `app/api/public/social-icon/[key]/route.ts`
- `/api/public/workspace-status` — `app/api/public/workspace-status/route.ts`
- `/api/published-activities` — `app/api/published-activities/route.ts`
- `/api/quiz` — `app/api/quiz/route.ts`
- `/api/quiz/submit` — `app/api/quiz/submit/route.ts`
- `/api/rankings/me` — `app/api/rankings/me/route.ts`
- `/api/rankings` — `app/api/rankings/route.ts`
- `/api/receipt-rush/my` — `app/api/receipt-rush/my/route.ts`
- `/api/receipt-rush/submit` — `app/api/receipt-rush/submit/route.ts`
- `/api/receipt-rush/upload` — `app/api/receipt-rush/upload/route.ts`
- `/api/receipts/[paymentId]/pdf` — `app/api/receipts/[paymentId]/pdf/route.ts`
- `/api/receipts/[paymentId]` — `app/api/receipts/[paymentId]/route.ts`
- `/api/refill-energy` — `app/api/refill-energy/route.ts`
- `/api/shop/products/[id]/buy` — `app/api/shop/products/[id]/buy/route.ts`
- `/api/shop/products/[id]` — `app/api/shop/products/[id]/route.ts`
- `/api/shop/products` — `app/api/shop/products/route.ts`
- `/api/shop/settings` — `app/api/shop/settings/route.ts`
- `/api/shop/upload` — `app/api/shop/upload/route.ts`
- `/api/staking` — `app/api/staking/route.ts`
- `/api/student/balance` — `app/api/student/balance/route.ts`
- `/api/student/me` — `app/api/student/me/route.ts`
- `/api/student/payments/[id]/cancel` — `app/api/student/payments/[id]/cancel/route.ts`
- `/api/student/session` — `app/api/student/session/route.ts`
- `/api/students/[id]/balance` — `app/api/students/[id]/balance/route.ts`
- `/api/students/[id]/portal-password` — `app/api/students/[id]/portal-password/route.ts`
- `/api/students/[id]` — `app/api/students/[id]/route.ts`
- `/api/students` — `app/api/students/route.ts`
- `/api/support-chat` — `app/api/support-chat/route.ts`
- `/api/sync` — `app/api/sync/route.ts`
- `/api/tasks/check/redeem-code` — `app/api/tasks/check/redeem-code/route.ts`
- `/api/tasks/check/referral` — `app/api/tasks/check/referral/route.ts`
- `/api/tasks/check/telegram` — `app/api/tasks/check/telegram/route.ts`
- `/api/tasks/check/visit` — `app/api/tasks/check/visit/route.ts`
- `/api/tasks` — `app/api/tasks/route.ts`
- `/api/tasks/update/visit` — `app/api/tasks/update/visit/route.ts`
- `/api/team-challenges/[id]/accept` — `app/api/team-challenges/[id]/accept/route.ts`
- `/api/team-challenges/[id]/contribute` — `app/api/team-challenges/[id]/contribute/route.ts`
- `/api/team-challenges/[id]` — `app/api/team-challenges/[id]/route.ts`
- `/api/team-challenges` — `app/api/team-challenges/route.ts`
- `/api/teams/[id]/manage/opinions/[opinionId]/vote` — `app/api/teams/[id]/manage/opinions/[opinionId]/vote/route.ts`
- `/api/teams/[id]/manage` — `app/api/teams/[id]/manage/route.ts`
- `/api/teams/[id]/member-dashboard` — `app/api/teams/[id]/member-dashboard/route.ts`
- `/api/teams/[id]/requests` — `app/api/teams/[id]/requests/route.ts`
- `/api/teams/by-code` — `app/api/teams/by-code/route.ts`
- `/api/teams/join` — `app/api/teams/join/route.ts`
- `/api/teams/list` — `app/api/teams/list/route.ts`
- `/api/teams/request` — `app/api/teams/request/route.ts`
- `/api/teams` — `app/api/teams/route.ts`
- `/api/transfers/me` — `app/api/transfers/me/route.ts`
- `/api/transfers/recent` — `app/api/transfers/recent/route.ts`
- `/api/transfers/send` — `app/api/transfers/send/route.ts`
- `/api/tv-programs/[id]/comments` — `app/api/tv-programs/[id]/comments/route.ts`
- `/api/tv-programs` — `app/api/tv-programs/route.ts`
- `/api/upgrade/energy-limit` — `app/api/upgrade/energy-limit/route.ts`
- `/api/upgrade/mine` — `app/api/upgrade/mine/route.ts`
- `/api/upgrade/multitap` — `app/api/upgrade/multitap/route.ts`
- `/api/ura-fc/matches` — `app/api/ura-fc/matches/route.ts`
- `/api/user/delete` — `app/api/user/delete/route.ts`
- `/api/user/referrals` — `app/api/user/referrals/route.ts`
- `/api/user` — `app/api/user/route.ts`
- `/api/wallet/connect` — `app/api/wallet/connect/route.ts`
- `/api/wallet/disconnect` — `app/api/wallet/disconnect/route.ts`
- `/api/webhooks/livepay` — `app/api/webhooks/livepay/route.ts`
- `/api/webhooks/mbiyo` — `app/api/webhooks/mbiyo/route.ts`
- `/api/webhooks/momo` — `app/api/webhooks/momo/route.ts`
- `/api/webhooks/provider/[code]` — `app/api/webhooks/provider/[code]/route.ts`
- `/api/webhooks/telegram` — `app/api/webhooks/telegram/route.ts`
- `/api/weekly-event` — `app/api/weekly-event/route.ts`

## Documentation vs tree (manual)

| `docs/README.md` claims | This repo |
|----------------------------|-----------|
| Student portal `/student`, `/student/login` | **Yes** — `app/student/**/page.tsx` |
| Master console `/admin/master` | **Yes** — `app/admin/master/`; verify `/api/master/*` against `app/api/master/` |

*Align README or add routes so product and code match.*
