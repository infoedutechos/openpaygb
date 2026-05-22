# Connect Vercel to maglip/clicker-game - Exact Steps

## Your Current Setup
- ✅ Logged into Vercel as: `safesterwarrior-3280`
- ✅ Projects available: `safe-ster`, `clicker`, `afrolumens`
- ✅ Project ID: `prj_7XDHef8PB2Q2VkCqIqoE7MGndyUo`
- ✅ Repository ready: `maglip/clicker-game` branch `fix/update-referral-links`

## Step-by-Step: Connect Repository

### Step 1: Open Your Project
1. Go to: https://vercel.com/dashboard
2. Find your project (likely `safe-ster` based on project ID)
3. Click on it to open

### Step 2: Disconnect Current Repository
1. Click **Settings** (gear icon or Settings tab)
2. Click **Git** in the left sidebar
3. Scroll to find the connected repository
4. Click **"Disconnect"** or **"Change Repository"**
5. Confirm the disconnection

### Step 3: Connect New Repository
1. Still in **Settings** → **Git**
2. Click **"Connect Git Repository"** button
3. You'll see a list of repositories
4. **If you see `maglip/clicker-game`:**
   - Click on it
   - Click **"Connect"** or **"Import"**
5. **If you DON'T see it:**
   - You need to authorize with the correct GitHub account
   - See "Handle Different GitHub Account" below

### Step 4: Configure Branch
After connecting, you'll see configuration options:
1. **Production Branch:** 
   - Select `fix/update-referral-links` from the dropdown
   - OR type it in if it's not listed
2. **Root Directory:** Leave empty
3. **Framework Preset:** Should auto-detect Next.js
4. Click **"Deploy"** or **"Save"**

### Step 5: Handle Different GitHub Account (If Needed)

**If `maglip/clicker-game` doesn't appear in the list:**

1. **Vercel Dashboard** → Click your profile (top right) → **Settings**
2. Click **"Integrations"** or **"Git"** in left sidebar
3. Find **GitHub** in the list
4. Click **"Disconnect"** or **"Configure"**
5. Click **"Connect"** or **"Add Integration"**
6. **Important:** When GitHub authorization opens:
   - If you see the wrong GitHub account, click "Sign out" and sign in with the account that has access to `maglip/clicker-game`
   - Authorize Vercel to access repositories
   - Make sure `maglip/clicker-game` is selected or "All repositories" is selected
7. Complete the authorization
8. Go back to your project → **Settings** → **Git**
9. Now `maglip/clicker-game` should appear in the list
10. Connect it

### Step 6: Verify Connection
After connecting, check:
- ✅ **Settings** → **Git** shows:
  - Repository: `maglip/clicker-game`
  - Production Branch: `fix/update-referral-links`
  - "Disconnect" button is visible (means connected)

### Step 7: Trigger Deployment
1. Go to **Deployments** tab
2. You should see a new deployment starting automatically
3. OR click **"Redeploy"** → Select latest commit from `fix/update-referral-links`
4. Make sure **Build Cache** is **OFF**

## Expected Result

After deployment, the build logs should show:
```
Cloning github.com/maglip/clicker-game (Branch: fix/update-referral-links, Commit: dc2d38d)
...
> clicker-telegram-app-visual@0.2.3 vercel-build
```

And the live site should show:
- ✅ "Welcome to AfroLumens"
- ✅ "Loading AfroLumens"
- ✅ All 9 ranks: Baobab, Mwami, Nkosi, Sultan, Negus, Pharaoh, Eze, Emir, Mansa

## Quick Links

- Vercel Dashboard: https://vercel.com/dashboard
- Your Project Settings: https://vercel.com/[your-project]/settings
- GitHub Integration: https://vercel.com/settings/integrations
