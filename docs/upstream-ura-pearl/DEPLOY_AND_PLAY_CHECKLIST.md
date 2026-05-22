# Will the game load and play after deployment?

**Yes**, if every item below is true. Check each one before you deploy.

---

## 1. Build will succeed

| Item | Status |
|------|--------|
| `next.config.mjs` has `eslint: { ignoreDuringBuilds: true }` | ✅ Already set |
| `package.json` has `eslint` and `eslint-config-next` in dependencies | ✅ Already set |
| `vercel-build` runs `prisma generate && next build` | ✅ In vercel.json |

So the **build** should complete. No change needed here.

---

## 2. Vercel environment variables (required for runtime)

These must be set in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use it):

| Variable | Why it’s needed |
|----------|------------------|
| **`DATABASE_URL`** | Prisma connects to your DB. Without it, `/api/user` and other APIs fail. |
| **`BOT_TOKEN`** | Your Telegram bot token from [@BotFather](https://t.me/BotFather). Used to validate `WebApp.initData`. Without it, `/api/user` returns 403. |
| **`BYPASS_TELEGRAM_AUTH`** | Set to **`false`** in production so the server validates real Telegram data. |
| **`NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH`** | Set to **`false`** in production so the client sends real `WebApp.initData` instead of a placeholder. |

If all four are set correctly, the **backend** is ready for real users.

---

## 3. How users must open the game

| Requirement | Reason |
|-------------|--------|
| Open from **Telegram** (Mini App inside the bot) | Only then does Telegram inject valid `WebApp.initData`. In a normal browser there is no init data → 403. |
| Use the **production** URL | e.g. `https://maglip-clicker-game.vercel.app/clicker`. Preview URLs (`…-95ipo46ka-…vercel.app`) can return 401 if Deployment Protection is on. |

So: **“Open from Telegram using the production link”** = game will load and play (assuming step 2 is done).

---

## 4. Quick confirmation list

Before you say “the game will load and play,” verify:

- [ ] **DATABASE_URL** is set on Vercel (Production).
- [ ] **BOT_TOKEN** is set on Vercel (Production).
- [ ] **BYPASS_TELEGRAM_AUTH** = `false` on Vercel (Production).
- [ ] **NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH** = `false` on Vercel (Production).
- [ ] Bot’s Mini App URL points at your **production** URL (e.g. `https://maglip-clicker-game.vercel.app/clicker`).
- [ ] You (or test users) open the game **from Telegram**, not from Chrome/Safari.

If all are checked, **yes: on the next deployment, the game will load and play** when opened from Telegram using the production URL.

---

## 5. If something still fails

- **403 on /api/user** → BOT_TOKEN wrong/missing, or game opened outside Telegram, or bypass still `true`.
- **500 / “Failed to fetch or create user”** → DATABASE_URL wrong or DB unreachable (e.g. Atlas IP allowlist: allow `0.0.0.0/0` for Vercel).
- **401 on images/static** → User is on a protected preview URL; switch to production URL or adjust Deployment Protection.
