# Vercel not auto-deploying? Fix it here

Your pushes to `fix/update-referral-links` are reaching GitHub. If Vercel isn’t building, it’s almost always one of these.

---

## 1. Set the Production Branch (most common)

Vercel only **auto-deploys Production** from the branch you set as “Production Branch”. If that’s `main` or `master`, pushes to `fix/update-referral-links` won’t trigger a production deploy.

**Do this:**

1. Open [vercel.com](https://vercel.com) → your project.
2. Go to **Settings** → **Git**.
3. Find **Production Branch**.
4. Change it to: **`fix/update-referral-links`**.
5. Save.

After that, every push to `fix/update-referral-links` will trigger a new production deployment.

---

## 2. Confirm the repo is connected

- **Settings** → **Git** → **Connected Git Repository**  
  Should be: `maglip/clicker-game` (or your fork).  
  If it’s wrong or “Not connected”, connect the correct repo.

---

## 3. Check GitHub webhook (if still no deploy)

- On GitHub: **Repo** → **Settings** → **Webhooks**.  
  You should see a webhook for `https://api.vercel.com/...` or similar.  
  If it’s missing or shows recent errors, in Vercel try **Settings** → **Git** → **Disconnect** then **Connect** again to recreate the webhook.

---

## 4. Trigger a deploy manually (test)

- In Vercel: **Deployments** tab → **⋯** on the latest deployment → **Redeploy**.  
  Or **Deployments** → **Create Deployment** and choose branch `fix/update-referral-links`.  
  If that works, the codebase and build are fine; the fix is step 1 (Production Branch).

---

## Summary

| What you want | What to set |
|---------------|-------------|
| Auto-deploy when you push `fix/update-referral-links` | **Production Branch** = `fix/update-referral-links` |
| Same as on Windows | Same: connect repo + Production Branch = `fix/update-referral-links` |

After changing the Production Branch, run `npm run deploy` again; a new deployment should start within a few seconds.
