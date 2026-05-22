# Manual Webhook Setup - Vercel Not Creating Webhooks Automatically

## Problem
Vercel is not automatically creating webhooks in GitHub, even though permissions are correct.

## Solution 1: Use Vercel Deploy Hook (Easiest)

### Step 1: Create Deploy Hook in Vercel
1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Git**
2. Scroll down to **"Deploy Hooks"** section
3. Click **"Create Hook"**
4. Name it: "GitHub Push Trigger"
5. Copy the hook URL (looks like: `https://api.vercel.com/v1/integrations/deploy/...`)

### Step 2: Create Webhook in GitHub Manually
1. Go to: `https://github.com/Safester-warrior/SafeSter/settings/hooks`
2. Click **"Add webhook"**
3. Fill in:
   - **Payload URL:** Paste the Deploy Hook URL from Vercel
   - **Content type:** `application/json`
   - **Secret:** Leave empty (or get from Vercel if available)
   - **Which events:** Select "Just the push event"
   - **Active:** Checked ✅
4. Click **"Add webhook"**

### Step 3: Test
1. Make a small change and push
2. Check if Vercel deploys automatically

## Solution 2: Manual GitHub Webhook (Advanced)

If Deploy Hook doesn't work, we can create a webhook that calls Vercel's API directly.

### Get Vercel Project Info
1. Vercel Dashboard → Your Project → **Settings** → **General**
2. Note your:
   - **Project ID**
   - **Team ID** (if applicable)

### Create Webhook
The webhook URL format is typically:
```
https://api.vercel.com/v1/integrations/deploy/{integration-id}/{project-id}
```

But we need the integration ID from Vercel.

## Solution 3: Continue with Manual Deployments (Current Workaround)

Since automatic deployment isn't working, continue using manual deployments:

1. **Vercel Dashboard** → **Deployments**
2. Click **"Create Deployment"**
3. Select latest commit
4. Deploy

This works, just requires manual triggering.

## Solution 4: Use Vercel CLI (Alternative)

You can install Vercel CLI and deploy from command line:
```bash
npm i -g vercel
vercel login
vercel --prod
```

This bypasses webhooks entirely.
