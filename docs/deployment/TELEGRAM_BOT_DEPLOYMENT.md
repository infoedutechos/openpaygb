# Telegram bot token — Master Admin & Vercel

**Production:** `https://odelpay.vercel.app` · **Last updated:** 2026-06-03

How to store the BotFather token in **Master Admin**, push it to **Vercel**, and confirm the bot + webhook are aligned.

---

## Quick check

```powershell
npm run telegram:alignment-check
```

Public API (no token values): `GET /api/public/telegram-config`

Master UI: `/admin/master#telegram-hub` (status) and `/admin/master#deployment-environment` (edit + Vercel sync).

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `BOT_TOKEN` | Primary bot token (Play broadcasts + tuition when set) |
| `TELEGRAM_BOT_TOKEN` | Tuition bot token (used when `BOT_TOKEN` unset) |
| `NEXT_PUBLIC_BOT_USERNAME` | Public `@handle` (no secret) |
| `TELEGRAM_WEBHOOK_SECRET` | Optional header check on `POST /api/webhooks/telegram` |
| `TELEGRAM_ANNOUNCEMENT_CHANNEL_ID` | Optional channel posts from Master notifications |
| `NEXT_PUBLIC_APP_URL` | Required for webhook URL and Mini App links |

**Resolution order:** Master Admin encrypted override → Vercel env → `.env` (see `lib/deployment-env-resolve.ts` → `resolvedBotToken()`).

---

## Step-by-step

### 1. Get token from BotFather

1. Open [@BotFather](https://t.me/BotFather) → `/token` for your bot (e.g. @ODELHUBPayBot).
2. Copy the token (format `123456:ABC-DEF…`).

### 2. Save in Master Admin

1. Sign in as **Master admin** → `/admin/master#deployment-environment`.
2. Expand **Telegram bot & announcements**.
3. Paste into **`BOT_TOKEN`** or **`TELEGRAM_BOT_TOKEN`** (sensitive field).
4. Click **Save group**.
5. Click **Sync to Vercel** (requires `VERCEL_ACCESS_TOKEN` in overrides or linked CLI session).

Alternatively run from a trusted machine with `.env` populated:

```powershell
npm run deployment:provision-sync
```

This copies all registry vars (including bot token) to Master overrides and Vercel production.

### 3. Register webhook

```powershell
npm run telegram:set-webhook
```

Uses `TELEGRAM_BOT_TOKEN` / `BOT_TOKEN` and `NEXT_PUBLIC_APP_URL` from env. Target: `{APP_URL}/api/webhooks/telegram`.

### 4. Mini App menu (optional)

```powershell
npm run telegram:set-menu
```

---

## Master Admin surfaces

| Section | Anchor | What it shows |
|---------|--------|----------------|
| Telegram hub | `#telegram-hub` | Channel settings, bot token **configured** flag, webhook URL |
| Deployment env | `#deployment-environment` | Edit `BOT_TOKEN` / `TELEGRAM_BOT_TOKEN`, sync Vercel |
| Platform communications | `#platform-communications` | Push notifications to Telegram users |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Vercel deploy OK but bot silent | Token not in Vercel production — re-sync from Master Admin |
| Webhook 401 | `TELEGRAM_WEBHOOK_SECRET` mismatch between Telegram and env |
| Mini App won’t open | Set `NEXT_PUBLIC_APP_URL` to production URL; run `telegram:set-menu` |
| Master TMA sign-in fails | Link **personal** Telegram id via `npm run admin:ensure-master-telegram` (not channel id) |

---

## Related

- [TELEGRAM_MINI_APP.md](./TELEGRAM_MINI_APP.md)
- [DEPLOYMENT_ENV_PRODUCTION.md](./DEPLOYMENT_ENV_PRODUCTION.md)
- [WEBHOOK_SECRETS_ALIGNMENT.md](./WEBHOOK_SECRETS_ALIGNMENT.md)
