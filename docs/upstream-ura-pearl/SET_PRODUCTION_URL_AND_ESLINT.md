# Where to Set Production URL & How to Fix ESLint Build Message

---

## 1. Production URL — where and how

The **Production URL** is the link your Telegram bot opens when users tap “Play” or open the Mini App. You set it **in Telegram**, not in Vercel.

### Step 1: Get your production URL from Vercel

1. Open [vercel.com](https://vercel.com) → your project (**maglip-clicker-game**).
2. Go to **Settings** → **Domains**.
3. Your production URL is shown there, e.g.:
   - `maglip-clicker-game.vercel.app`
   - Game URL (use this in Telegram): **`https://maglip-clicker-game.vercel.app/clicker`**

Use that as the Web App URL in Telegram.

### Step 2: Set it in Telegram (BotFather / bot menu)

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send **`/mybots`** → choose your bot.
3. Open **“Bot Settings”** or **“Edit Bot”**.
4. Depending on your setup, use one of these:
   - **“Menu Button”** or **“Configure inline / menu”**  
     → Set **“Menu Button URL”** or **“Web App URL”** to:
     ```text
     https://maglip-clicker-game.vercel.app/clicker/clicker
     ```
   - Or, if you created the app via **`/newapp`** or a similar command, that flow asks for the **“Web App URL”** — paste the same URL there.

Use exactly **`https://maglip-clicker-game.vercel.app/clicker`** (the game page), not the root domain or the long preview URL (`...-95ipo46ka-...vercel.app`).

### Summary

| Where | What to set |
|-------|-------------|
| **Vercel** | Nothing to set. Production URL is under **Settings → Domains** (e.g. `maglip-clicker-game.vercel.app`). |
| **Telegram (BotFather / bot menu)** | **Web App URL** or **Menu Button URL** = `https://maglip-clicker-game.vercel.app/clicker` |

---

## 2. ESLint build message — how to fix

Message:

```text
ESLint must be installed in order to run during builds: npm install --save-dev eslint
```

### What’s already done in the repo

1. **`next.config.mjs`** — `eslint: { ignoreDuringBuilds: true }` is set so the build does **not** depend on ESLint and won’t fail if it’s missing.
2. **`package.json`** — `eslint` and `eslint-config-next` are in **dependencies** so they are installed on every deploy.

### What you need to do

1. **Commit and push**  
   Make sure `next.config.mjs` and `package.json` are committed and pushed so Vercel builds from the latest code.

2. **Redeploy with cache cleared**  
   - Vercel → your project → **Deployments**.  
   - Open the **⋮** menu on the latest deployment → **Redeploy**.  
   - Turn **on** “Clear build cache” (or similar).  
   - Confirm redeploy.

After that, the ESLint message should either disappear (because ESLint is installed and used) or the build will still succeed because of `ignoreDuringBuilds: true`.

### Optional: disable ESLint during build via Vercel

If the message still appears and you want to fully skip ESLint in the build:

1. Vercel → project → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `NEXT_DISABLE_ESLINT_PLUGIN`  
   - **Value:** `1`  
   - **Environments:** Production (and Preview if you use it).
3. Redeploy.

(Use this only if clearing cache and redeploying with the current `next.config.mjs` / `package.json` doesn’t remove the message.)

---

## Quick checklist

- [ ] Production URL in **Telegram** (BotFather / bot menu) = `https://maglip-clicker-game.vercel.app/clicker`
- [ ] `next.config.mjs` has `eslint: { ignoreDuringBuilds: true }` and is pushed
- [ ] `package.json` has `eslint` and `eslint-config-next` in `dependencies` and is pushed
- [ ] Redeploy on Vercel with **“Clear build cache”** turned on
