# Understanding These Errors

## 1. `/api/user` returns 403 — "Failed to fetch or create user"

**What it means:** The server rejected the request because **Telegram init data was invalid or missing**.

**Why it happens:**

| Situation | What happens |
|-----------|----------------|
| **Opened in a normal browser** (Chrome, Safari, etc.) | There is no Telegram Web App context, so `WebApp.initData` is empty. The client may send a placeholder. The server validates init data with your bot token and returns **403** when it’s missing or invalid. |
| **Opened inside Telegram** but `BOT_TOKEN` is wrong/missing on the server | Validation (HMAC over init data) fails → **403**. |
| **Init data older than 3 hours** | Server treats it as expired → **403**. |

**Relevant code:**

- **Client** (`components/Loading.tsx`): Sends `telegramInitData` from `WebApp.initData` (or a placeholder when bypass env is set).
- **Server** (`app/api/user/route.ts`): Calls `validateTelegramWebAppData(telegramInitData)`. If validation fails, it returns **403** with "Invalid Telegram data" / "Please open the game from the Telegram app."
- **Validation** (`utils/server-checks.ts`): Uses `BOT_TOKEN` to verify the `hash` in init data. If `BOT_TOKEN` is missing, hash is missing, or hash is wrong → validation fails → **403**.

**What to do:**

1. **Always open the game from Telegram** (Mini App inside the bot), not by pasting the URL in a normal browser.
2. **On Vercel:** Set `BOT_TOKEN` in Project → Settings → Environment Variables to your bot’s token from [@BotFather](https://t.me/BotFather).
3. **Local/dev only:** You can use `BYPASS_TELEGRAM_AUTH=true` and `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH=true` so the app and API accept placeholder data. Do **not** use bypass in production.

---

## 2. "ESLint must be installed in order to run during builds"

**What it means:** During `next build`, Next.js tries to run ESLint. If the `eslint` package isn’t installed (or not available in the install that runs on the build), you see that message.

**Why it can still appear:**

- On Vercel, installs sometimes only install production dependencies, so a dev-only `eslint` may be skipped.
- Moving `eslint` and `eslint-config-next` into `dependencies` in `package.json` makes them always installed, which usually fixes it.

**What we did:**

1. **`package.json`:** `eslint` and `eslint-config-next` are in `dependencies` so they are installed on every build.
2. **`next.config.mjs`:** `eslint: { ignoreDuringBuilds: true }` so the build does **not** require ESLint to run. The build succeeds even if ESLint isn’t available, and you can still run `npm run lint` locally.

**If the message persists:**

- Commit and push the updated `package.json` and `next.config.mjs`, then redeploy.
- Or keep `ignoreDuringBuilds: true` and rely on local/CI for linting.
