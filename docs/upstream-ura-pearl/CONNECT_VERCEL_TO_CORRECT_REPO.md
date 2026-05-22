# Connect Vercel to maglip/clicker-game Repository

## Step-by-Step Instructions

### Step 1: Disconnect Current Repository in Vercel
1. Go to **Vercel Dashboard** → Your Project (`safe-ster` or similar)
2. Click **Settings** → **Git**
3. Find the connected repository section
4. Click **"Disconnect"** or **"Change Repository"**
5. Confirm disconnection

### Step 2: Connect to Correct Repository
1. Still in **Settings** → **Git**
2. Click **"Connect Git Repository"** or **"Add Git Repository"**
3. You'll see a list of repositories
4. **Search for or find:** `maglip/clicker-game`
5. Click **"Connect"** or **"Import"**

### Step 3: Configure Branch Settings
After connecting, you'll be asked to configure:
1. **Production Branch:** Select `fix/update-referral-links` (or the branch you want)
2. **Root Directory:** Leave empty (or `/`)
3. **Framework Preset:** Should auto-detect Next.js
4. Click **"Deploy"** or **"Continue"**

### Step 4: Authorize GitHub Access (If Needed)
If prompted:
1. GitHub will ask you to authorize Vercel
2. **Important:** Make sure you're logged into the GitHub account that has access to `maglip/clicker-game`
3. If you see a different account, log out and log in with the correct one
4. Grant Vercel access to the repository
5. Authorize the installation

### Step 5: Verify Connection
After connecting:
1. Go back to **Settings** → **Git**
2. You should see:
   - ✅ Repository: `maglip/clicker-game`
   - ✅ Production Branch: `fix/update-referral-links` (or your selected branch)
   - ✅ "Disconnect" button (means it's connected)

### Step 6: Trigger Deployment
After connecting, Vercel should:
- Automatically deploy the latest commit from `fix/update-referral-links`
- OR you can manually trigger: **Deployments** → **Redeploy** → Select latest commit

## Handling Different Email Accounts

### If Vercel Can't See the Repository:
This means the GitHub account connected to Vercel doesn't have access to `maglip/clicker-game`.

**Solution:**
1. **Vercel Dashboard** → **Settings** (top right, account settings)
2. Click **"Integrations"** or **"Git"**
3. Find **GitHub** integration
4. Click **"Disconnect"** or **"Configure"**
5. Reconnect and make sure to:
   - Log in with the GitHub account that has access to `maglip/clicker-game`
   - Grant access to the repository
   - Authorize the Vercel GitHub App

### Alternative: Add Vercel Account to Repository
If you can't change the GitHub account in Vercel:
1. Go to GitHub → `maglip/clicker-game` → **Settings** → **Collaborators**
2. Add the GitHub account that's connected to Vercel
3. Give it **Write** or **Admin** access
4. Then try connecting in Vercel again

## After Connection

Once connected, check:
1. **Deployments** tab - should show a new deployment
2. Build logs should show:
   - ✅ Repository: `maglip/clicker-game`
   - ✅ Branch: `fix/update-referral-links`
   - ✅ Commit: `dc2d38d` (or latest)
3. After deployment, verify the live site shows:
   - ✅ "Welcome to AfroLumens"
   - ✅ "Loading AfroLumens"
   - ✅ All 9 ranks updated

## Troubleshooting

### If repository doesn't appear in Vercel:
- The GitHub account in Vercel doesn't have access
- Reconnect with the correct GitHub account
- Or add that account as a collaborator to the repository

### If deployment fails:
- Check build logs for errors
- Verify the branch name is correct
- Make sure all dependencies are in package.json
