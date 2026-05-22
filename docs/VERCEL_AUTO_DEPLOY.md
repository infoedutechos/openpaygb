# Auto-deploy on Vercel (ODELHUB Pay)

Vercel can **build and deploy automatically** every time you push to GitHub. No extra GitHub Action is required if the project is connected to the repo.

**This repo:** `https://github.com/infoedutechos/ODELHUBPay.git`  
**Production branch:** `main`

---

## One-time setup (Vercel dashboard)

### 1. Connect GitHub

1. Open [vercel.com/dashboard](https://vercel.com/dashboard).
2. **Add New…** → **Project** (or open your existing ODELHUB Pay project).
3. **Import** `infoedutechos/ODELHUBPay` (authorize GitHub if asked).
4. **Root Directory:** `.` (leave empty / default).
5. **Framework:** Next.js.
6. Add environment variables — see [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md).
7. Click **Deploy** once to finish linking.

### 2. Turn on automatic deployments

1. Project → **Settings** → **Git**.
2. Confirm **Connected Git Repository** is `infoedutechos/ODELHUBPay`.
3. Set **Production Branch** to **`main`**.
4. Ensure these are **enabled** (defaults):
   - **Production Branch** deployments → auto on push to `main`
   - **Preview Deployments** → auto on other branches / PRs (optional but useful)

### 3. Build settings (confirm)

| Setting | Value |
|---------|--------|
| Production Branch | `main` |
| Build Command | `npm run build` or `npm run vercel-build` |
| Install Command | `npm install` |
| Output Directory | (default for Next.js) |

### 4. GitHub webhook (usually automatic)

On GitHub: **Repository** → **Settings** → **Webhooks**  
You should see a Vercel webhook (`api.vercel.com`). If pushes do nothing, in Vercel use **Settings** → **Git** → **Disconnect**, then **Connect** again.

---

## Daily workflow (auto deploy)

```bash
git add .
git commit -m "Your change description"
git push origin main
```

Within **~30 seconds**, Vercel should show a new deployment under **Deployments**.

- Push to **`main`** → **Production** deployment (your live URL).
- Push to **another branch** → **Preview** deployment (unique preview URL).

---

## Verify it works

1. Make a tiny change (e.g. comment in README).
2. `git commit` + `git push origin main`.
3. Vercel → **Deployments** → status should go **Building** → **Ready**.

If nothing starts, check **Production Branch** is `main` (not `master` or another branch).

---

## If deploy does not start

| Symptom | Fix |
|---------|-----|
| Push to `main`, no build | **Settings** → **Git** → **Production Branch** = `main` |
| Wrong repo | Reconnect `infoedutechos/ODELHUBPay` |
| Build fails | Open failed deployment → **Build Logs**; fix env vars ([VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)) |
| “Ignored Build Step” | **Settings** → **Git** → clear custom ignore command unless you added one on purpose |
| Team / permission | GitHub user pushing must have access to Vercel project |

---

## Optional: Deploy Hook (manual / CI trigger)

A **Deploy Hook** is a secret URL that starts a **production** deployment without pushing to Git. Create or copy it in Vercel → **Project** → **Settings** → **Git** → **Deploy Hooks**.

```text
https://api.vercel.com/v1/integrations/deploy/<project-id>/<secret>
```

**Do not commit the full URL** (the last path segment is a secret). Store it in a password manager or as a GitHub Actions secret (e.g. `VERCEL_DEPLOY_HOOK`).

Trigger from a terminal:

```bash
curl -X POST "$VERCEL_DEPLOY_HOOK"
```

A successful call returns JSON with `"state":"PENDING"` (or similar) and a `job` id. Check **Deployments** in the [Vercel dashboard](https://vercel.com/odeldevelopers-projects/odelhubpay).

Use a Deploy Hook when:

- Git is connected but you want a **redeploy** of the same commit (e.g. after changing env vars).
- An external system (cron, master script) must deploy without `git push`.

**Prefer Git push → auto deploy** for normal development; the hook is a backup, not a replacement for connecting the repo.

---

## Optional: deploy script (commit + push only)

The repo includes `npm run deploy` which runs `scripts/deploy.sh` (git add, commit, push). Vercel still does the actual build **on its servers** after the push — the script does not replace Vercel.

```bash
npm run deploy
```

---

## Do not use two deploy systems

- **Recommended:** Vercel Git integration (push → auto deploy).
- **Not needed:** A separate GitHub Action that runs `vercel deploy` unless you have a special CI requirement.

This project’s `.github/workflows/ci.yml` runs tests on push; it does **not** deploy to Vercel (Vercel handles deploy via webhook).

---

## Related

- [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) — environment variables
- [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) — MongoDB, cron, serverless
