# ODEL HUB Pay — Telegram Mini App

**Bot:** `@ODELHUBPayBot` · **Mini App:** `/tma` · **Brand:** OpenPayGB

---

## Architecture

```
@ODELHUBPayBot
  ├── Bot landing (/start) — fintech reply keyboard + Open App (not command menus)
  ├── Notifications — payment, receipt, card top-up, tuition due
  └── Web App → /tma
        ├── POST /api/tma/session (Telegram initData → student/admin cookies)
        ├── GET /api/tma/me
        ├── GET /api/tma/receipts
        └── In-app: pay, card, history, profile (+ school/master dashboards)
              │
              ▼
        ODEL HUB Pay API (Next.js routes) → MongoDB
```

~90% of UX lives in the Mini App; the bot handles notifications, alerts, receipts, reminders, and quick actions.

---

## Setup commands

Run from the project root after `.env.local` has `BOT_TOKEN` or `TELEGRAM_BOT_TOKEN` and `NEXT_PUBLIC_APP_URL`.

**HTTPS required for Telegram:** `telegram:set-webhook` and `telegram:set-menu` call the Bot API with `NEXT_PUBLIC_APP_URL`. Telegram rejects `http://localhost` — use your production HTTPS URL (e.g. Vercel) in `.env.local` or env when running these, or use a tunnel (ngrok, Cloudflare Tunnel) with HTTPS for local bot testing.

```powershell
npm run telegram:set-webhook    # Bot webhook → POST /api/webhooks/telegram
npm run telegram:set-menu       # Menu button → /tma
npm run admin:link-telegram -- master@odelhub.local YOUR_TELEGRAM_ID
npm run db:push                 # Schema sync (AdminUser.telegramId index, etc.)
npm run dev:kill                # Stop dev server on Windows if Prisma EPERM
npm run db:generate             # Regenerate client after db:push
```

| Step | Command | Notes |
|------|---------|--------|
| Webhook | `telegram:set-webhook` | Fails with `An HTTPS URL must be provided` when `NEXT_PUBLIC_APP_URL` is `http://localhost:3000` |
| Menu | `telegram:set-menu` | Same HTTPS requirement for Web App URL |
| Admin link | `admin:link-telegram` | **Personal user id only** (from [@userinfobot](https://t.me/userinfobot)) — **not** a channel id like `-1003916461172`. Official channel is configured under **Master → Telegram bot & official channel**. Master default email: `master@odelhub.local` |
| Schema | `db:push` | Idempotent — safe to re-run |
| Client | `db:generate` | Run after `dev:kill` if Windows reports EPERM on `node_modules\.prisma` |

**Platform master (production):** `oiptechcore@gmail.com` · Telegram **711716655** (@OpenInnova) — use `npm run admin:ensure-master-telegram` if you change master email or id.

**Deploy note:** `NEXT_PUBLIC_APP_URL` must be `https://odelpay.vercel.app` when production is live. See [VERCEL_ODELPAY_DEPLOY.md](./VERCEL_ODELPAY_DEPLOY.md). If you get `DEPLOYMENT_NOT_FOUND`, fix Vercel team access + CI, deploy, then re-run `telegram:set-webhook` + `telegram:set-menu`.

**Optional — tuition due reminders (local script):**

```powershell
npm run telegram:tuition-reminders
```

**Production cron (registered in `vercel.json`):**

- Path: `GET /api/cron/telegram-tuition-reminders`
- Schedule: **Mondays 09:00 UTC** (`0 9 * * 1`)
- Auth: Vercel sends `Authorization: Bearer {CRON_SECRET}` when `CRON_SECRET` is set in project env.

**Local dry-run:**

```powershell
npm run telegram:tuition-reminders
```

**Master Mini App sign-in** — use your platform master email (e.g. `oiptechcore@gmail.com`) and personal Telegram id:

```powershell
npm run admin:ensure-master-telegram -- oiptechcore@gmail.com YOUR_PERSONAL_TELEGRAM_ID
```

---

## Required environment

| Variable | Purpose |
|----------|---------|
| `BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` | Bot API + initData validation |
| `NEXT_PUBLIC_APP_URL` | Webhook URL, Mini App URL, receipt links |
| `TELEGRAM_WEBHOOK_SECRET` | Optional webhook secret header |
| `TELEGRAM_ORG_SLUG` | Default school for bot-linked students |
| `CRON_SECRET` | Cron auth for tuition reminders |
| `NEXT_PUBLIC_BOT_USERNAME` | Bot username for invites/UI |

---

## Bot landing screen (`/start`)

When a user opens `@ODELHUBPayBot`:

- **ODEL HUB Pay** — Tuition • Wallet • Cards  
- Welcome + feature list (pay fees, card, receipts, balance)  
- **[Open App]** inline Web App button  
- **Reply keyboard:** Student Portal, OpenPay Card, Schools, Receipts, Pay Fees, Settings, Support, About  

Implementation: `lib/telegram/flow.ts`, `lib/telegram/keyboards.ts`

---

## Mini App screens (`/tma`)

| Tab / role | Spec coverage |
|------------|----------------|
| **Home** | Greeting, student ID, outstanding balance, Pay Now, quick actions |
| **Dashboard** | School, programme, progress %, paid/balance, next installment |
| **Card** | OpenPayGB virtual card, balance, in-app MoMo top-up |
| **Pay** | Institution, programme, amount, methods → in-app checkout |
| **History** | Receipt list, detail, PDF download, Telegram share |
| **Profile** | Welcome back + account details |
| **School admin** | Students, collected fees, links to mobile-safe admin routes (`/admin/students`, `/admin/payments`, …) |
| **Master admin** | Schools, students, payments, active cards, manager links (`/admin/master/organizations`, `#openpay-cards-overview`) |

**Student bottom nav:** Home · Card · Pay · History · Profile  

**Admin bottom nav:** Dashboard · Students · Payments · Reports · Settings  

Key files: `app/tma/`, `components/tma/TmaApp.tsx`, `hooks/useTmaBootstrap.ts`

---

## Implementation summary (delivered)

### 1. In-TMA checkout (`TmaPayFlow`)

- **Pay** tab — no redirect to `/pay/{orgSlug}` for primary flows  
- **OpenPayGB Card** → `POST /api/public/checkout/openpay-card-pay`  
- **Mobile Money** → `POST /api/public/checkout/livepay-start`  
- **TON Wallet** → `Telegram.WebApp.openLink` to checkout  
- **Bank Card** → coming-soon message  

### 2. In-TMA receipts (`TmaReceipts`)

- `GET /api/tma/receipts` — history with signed receipt/PDF URLs  
- History tab: list, detail, **Download PDF**, **Share**  

### 3. Admin `telegramId` + native sign-in

- `AdminUser.telegramId` (indexed)  
- `Student.telegramDueReminderAt`  
- `POST /api/tma/session` issues `odelhub_admin` cookie when admin is linked  
- `npm run admin:link-telegram -- <email> <telegramId>`  

### 4. Bot notification templates

| Template | Trigger |
|----------|---------|
| Payment confirmed + receipt | `notifyTelegramPaymentConfirmed` |
| Card top-up | `notifyTelegramCardTopup` on MoMo top-up confirm |
| Tuition due reminder | Cron + `sendTelegramTuitionDueReminder` |
| Receipt ready | Bundled in payment confirmed message |

Files: `lib/telegram/templates.ts`, `lib/telegram/notify-extended.ts`, `lib/telegram/tuition-reminders.ts`

### 5. In-app card top-up

- `TmaCardTopup` on Card tab → `/api/student/openpay-card/fund/momo-start`

---

## User roles & linking

| Role | Match field | Cookie |
|------|-------------|--------|
| Student | `Student.telegramId` | `odelhub_student` |
| School admin | `AdminUser.telegramId` | `odelhub_admin` |
| Master admin | `AdminUser.telegramId` (role=master) | `odelhub_admin` |

Students take precedence when the same Telegram id matches both student and admin.

**Channel vs personal id:** The official channel (e.g. ODEL HUB Official Channel, id `-1003916461172`, invite `https://t.me/+quY6fGi9uHxhNjhk`) is for community links and footer — configured at **Master Admin → Telegram bot & official channel** (`/admin/master#telegram-hub`). `admin:link-telegram` must use your **personal** Telegram user id from @userinfobot, not the channel id.

---

## Deep links

| URL | Opens |
|-----|--------|
| `/tma` | Home |
| `/tma?start=pay` | Pay tab |
| `/tma?start=card` | Card tab |
| `/tma?start=history` | History tab |
| `/tma?start=profile` | Profile tab |

Reply keyboard buttons open the Mini App with the matching `start` param.

---

## Local dev

- Browser: `http://localhost:3000/tma` (guest/preview with dev bypass)  
- `BYPASS_TELEGRAM_AUTH=true` or `next dev` skips initData HMAC  
- Telegram: open bot → **Open App**  

---

## Backlog IDs (completed)

| ID | Item |
|----|------|
| B-TMA-01 | Mini App shell + bot landing |
| B-TMA-02 | In-TMA checkout |
| B-TMA-03 | In-TMA receipts |
| B-TMA-04 | Admin `telegramId` |
| B-TMA-05 | Notification templates |
| B-TMA-06 | Tuition due cron |
| B-TMA-07 | Menu button script |

See also: `docs/BACKLOG.md`
