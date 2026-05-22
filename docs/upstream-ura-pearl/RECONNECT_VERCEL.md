# How to Reconnect Vercel to GitHub

## Step-by-Step: Reconnect Repository in Vercel

### Step 1: Disconnect Current Connection
1. Go to **Vercel Dashboard** → Your Project (`SafeSter` or similar)
2. Click **Settings** (gear icon or Settings tab)
3. Click **Git** in the left sidebar
4. Scroll down to find the connected repository
5. Click **"Disconnect"** or **"Change Repository"** button
6. Confirm the disconnection

### Step 2: Reconnect Repository
1. Still in **Settings** → **Git**
2. Click **"Connect Git Repository"** or **"Add Git Repository"**
3. You'll see a list of your GitHub repositories
4. Find and select: **`Safester-warrior/SafeSter`**
5. Click **"Connect"** or **"Import"**

### Step 3: Configure Settings
When reconnecting, you'll be asked to configure:
- **Production Branch:** Select `master`
- **Root Directory:** Leave empty (or `/`)
- **Framework Preset:** Should auto-detect Next.js
- Click **"Deploy"** or **"Continue"**

### Step 4: Authorize GitHub Access
If prompted:
1. GitHub will ask you to authorize Vercel
2. Make sure you're logged into the correct GitHub account
3. Grant Vercel access to the repository
4. Authorize the installation

### Step 5: Verify Connection
After reconnecting:
1. Go back to **Settings** → **Git**
2. You should see:
   - ✅ Repository: `Safester-warrior/SafeSter`
   - ✅ Production Branch: `master`
   - ✅ "Disconnect" button (means it's connected)

### Step 6: Trigger Deployment
After reconnecting, Vercel should:
- Automatically deploy the latest commit
- OR you can manually trigger: **Deployments** → **Redeploy** → Select latest commit

## Alternative: Check if Repository is Already Connected

If you see the repository is connected but deployments aren't triggering:

1. **Settings** → **Git**
2. Look for **"Deploy Hooks"** section
3. Check if there's a webhook URL listed
4. If missing, the webhook might not be set up correctly

## Troubleshooting

### If "Connect Git Repository" doesn't show your repo:
- Your GitHub account might not have access
- The repository might be private and Vercel needs access
- Check GitHub repository settings → Collaborators

### If reconnection fails:
- Make sure you're logged into the correct GitHub account
- Check if the repository is private (Vercel needs access)
- Try disconnecting and reconnecting again

## What Should Happen After Reconnection

1. Vercel will create a webhook in GitHub automatically
2. New deployments should trigger automatically on git push
3. You should see a new deployment start immediately after reconnecting
