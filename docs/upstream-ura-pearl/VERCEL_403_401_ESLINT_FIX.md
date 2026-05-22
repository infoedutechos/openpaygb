# Fix: 403 /api/user, 401 static files, ESLint build message

Quick reference for what’s going on and what to change.

---

## 1. POST /api/user → 403 (User {})

**Cause:** Telegram init data is missing or invalid. The API returns 403 when `validateTelegramWebAppData()` fails.

**Do this:**

1. **Open the app only from Telegram**  
   Use the Mini App inside your bot. Don’t open the same URL in Chrome/Safari.

2. **Set `BOT_TOKEN` on Vercel**  
   - Vercel → your project → **Settings** → **Environment Variables**  
   - Add `BOT_TOKEN` = your bot token from [@BotFather](https://t.me/BotFather)  
   - Apply to **Production** (and Preview if you use that domain).

3. **Production only**  
   Do **not** use `BYPASS_TELEGRAM_AUTH` or `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH` in production.

---

## 2. GET /_next/static/media/… → 401

**Cause:** Those requests go to a **preview** URL like  
`maglip-clicker-game-95ipo46ka-safetys-projects-41d12c22.vercel.app`.  
Vercel **Deployment Protection** (e.g. Vercel Authentication) is on for that deployment, so unauthenticated requests get **401**.

Your **production** game URL `https://maglip-clicker-game.vercel.app/clicker` is the one users should use.

**Do this:**

1. **Use the production domain for real users**  
   `https://maglip-clicker-game.vercel.app/clicker` (or your custom domain). Don’t share the long `…-95ipo46ka-…vercel.app` preview URL.

2. **If you want preview URLs to work without login**  
   - Vercel → project → **Settings** → **Deployment Protection**  
   - Turn off protection for **Preview** deployments, or add an exception so your Telegram app’s origin can load static assets.

3. **If you keep protection on previews**  
   Only team members (or people with bypass) will load preview deployments; normal users will keep getting 401 on that URL. Use production for testing with real users.

---

## 3. “ESLint must be installed in order to run during builds”

**Cause:** During `next build`, Next.js tries to run ESLint. If it can’t find the `eslint` package in that environment, it prints that message.

**Already done in the repo:**

- `next.config.mjs` has `eslint: { ignoreDuringBuilds: true }` so the build doesn’t **fail** when ESLint isn’t used.
- `package.json` has `eslint` and `eslint-config-next` in **dependencies** so they’re installed on every build.

**If you still see the message:**

1. **Confirm latest code is deployed**  
   Commit and push `next.config.mjs` and `package.json`, then trigger a new deployment.

2. **Clear Vercel build cache**  
   - Vercel → project → **Deployments** → open the latest deployment  
   - **Redeploy** and enable **“Clear build cache”**  
   Or: **Settings** → **General** → **Build Cache** → clear and redeploy.

3. **Optional: enforce “no ESLint during build”**  
   If you’re sure you want to skip ESLint in the build entirely, you can set in Vercel:
   - **Environment Variable**  
     `NEXT_DISABLE_ESLINT_PLUGIN` = `1`  
   (Only if your Next version supports it; otherwise rely on `ignoreDuringBuilds` and the steps above.)

---

## Summary

| Symptom | Reason | Action |
|--------|--------|--------|
| **403 on /api/user**, log shows `User {}` | Invalid/missing Telegram init data | Open only from Telegram; set `BOT_TOKEN` on Vercel; no bypass in prod |
| **401 on /_next/static/…** on `…-95ipo46ka-…vercel.app` | Deployment Protection on preview URL | Use production domain for users; or loosen/disable protection for Preview |
| **“ESLint must be installed…”** in build log | ESLint not found when build runs ESLint | Ensure latest `next.config.mjs` + `package.json` are deployed; clear build cache |

Production URL for users: **https://maglip-clicker-game.vercel.app/clicker** (or your custom domain). Use that when testing the full flow and Telegram init data.
