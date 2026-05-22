# Production "Stuck on Loading" – Fix & Checklist

If the game works in dev but **stops on "Loading AfroLumens"** when opened from Telegram after deploying to Vercel, the `/api/user` call is failing. Use this checklist to fix it.

---

## 1. Database connection (MongoDB)

### 1.1 `DATABASE_URL` in Vercel

- **Vercel** → Project → **Settings** → **Environment Variables**
- Ensure `DATABASE_URL` is set for **Production** (and Preview if you use it).
- Value format:  
  `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority`

### 1.2 MongoDB Atlas – allow Vercel to connect

Vercel runs on dynamic IPs, so Atlas must allow connections from anywhere:

1. **MongoDB Atlas** → Your project → **Network Access**
2. **Add IP Address**
3. Choose **“Allow Access from Anywhere”** (adds `0.0.0.0/0`)
4. Confirm

Without this, `/api/user` can hang or fail and the loading screen never leaves.

### 1.3 Check that the DB is reachable

- In Atlas: **Database** → **Connect** → **Connect your application**  
  Use the same connection string you put in `DATABASE_URL` (with the real password).
- Ensure the database and Prisma schema (e.g. `User` model) exist and match.

---

## 2. Telegram auth env vars (Vercel)

`/api/user` validates Telegram data using server-side env vars. If they’re wrong or missing, the API returns 403 and the app stays on loading.

### 2.1 Production env vars

In **Vercel** → **Settings** → **Environment Variables**, set:

| Variable | Where it's used | Example / note |
|----------|------------------|----------------|
| `BOT_TOKEN` | Server: Telegram validation | Your bot token from [@BotFather](https://t.me/BotFather) |
| `BYPASS_TELEGRAM_AUTH` | Server: skip validation | `true` only for testing; use `false` in real production |
| `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH` | Client: send "temp" initData | Must match server. `true` = bypass, `false` = real Telegram |

- For **production with real users**:  
  `BYPASS_TELEGRAM_AUTH=false` and `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH=false`, and `BOT_TOKEN` must be the bot that serves this game.
- For **testing without Telegram**:  
  Use `true` for both bypass vars and ensure the game is opened in a context where you’re okay with fake initData.

### 2.2 After changing env vars

Redeploy (e.g. **Deployments** → latest → **Redeploy**). Env vars are applied at build/run time, not retroactively.

---

## 3. Open the game from Telegram

The game must be opened **from the Telegram app** (bot menu, bot button, or link that opens inside Telegram).  
If you open the Vercel URL in a normal browser:

- `WebApp.initData` is empty
- With bypass off, validation fails → 403 → “Invalid Telegram data” / “Please open the game from the Telegram app”
- The loading screen can look “stuck” until the new error UI shows

So for production, always test by opening the bot inside Telegram.

---

## 4. What we changed in the app

1. **Loading screen**
   - If `/api/user` fails, we show an **error message** and a **Retry** button instead of hanging on “Loading AfroLumens”.
   - The message comes from the API (e.g. “Invalid Telegram data”, “Please open from Telegram”, “BOT_TOKEN is not set”, or DB errors).

2. **`/api/user` responses**
   - Responses include a `message` field when possible (e.g. validation message, “User already exists”, or a short error description).
   - The client uses this for the text on the loading error screen.

3. **API URL**
   - The client uses `window.location.origin` when calling `/api/user` so it always hits your deployed domain (e.g. `https://your-app.vercel.app/api/user`).

---

## 5. Quick checklist

- [ ] `DATABASE_URL` set in Vercel (Production, and Preview if needed).
- [ ] MongoDB Atlas **Network Access** allows `0.0.0.0/0` (or includes Vercel IPs).
- [ ] `BOT_TOKEN` set in Vercel and matches the bot that opens the game.
- [ ] `BYPASS_TELEGRAM_AUTH` and `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH` set and consistent (`false` for production).
- [ ] Redeployed after changing env vars.
- [ ] Game opened **from Telegram** (same bot as `BOT_TOKEN`).
- [ ] If it still sticks, check the new **error text + Retry** on the loading screen and Vercel **Functions** logs for `/api/user`.

---

## 6. If it still fails

1. **On the device:**  
   Note the exact error message shown under “Unable to load” (e.g. “Invalid Telegram data”, “Please open from Telegram”, “Connection failed”, etc.).

2. **In Vercel:**  
   **Project** → **Logs** or **Deployments** → **Functions** → select the deployment → look for logs for `POST /api/user` and any stack traces.

3. **Typical causes**
   - **“Invalid Telegram data” / “Please open from Telegram”** → Opened in browser, or wrong bot, or bypass/env mismatch.
   - **“BOT_TOKEN is not set”** → `BOT_TOKEN` missing or not applied (redeploy after adding it).
   - **“Connection failed” / timeout** → DB unreachable (Atlas IP allowlist or wrong `DATABASE_URL`).
   - **“Database or server error”** → Check Vercel function logs; often DB credentials or network.

Using this checklist and the new error/retry UI, you can quickly see whether the problem is DB, Telegram auth, or how/where the game is opened.
