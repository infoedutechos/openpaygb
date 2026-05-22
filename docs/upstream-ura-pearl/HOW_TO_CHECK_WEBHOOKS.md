# How to Check GitHub Webhooks for Vercel

## Step-by-Step Instructions

### Method 1: Direct Navigation
1. Go to **GitHub.com** and log in
2. Navigate to your repository: `https://github.com/Safester-warrior/SafeSter`
3. Click on **"Settings"** tab (at the top of the repository page, next to "Code", "Issues", "Pull requests", etc.)
4. In the left sidebar, scroll down and click on **"Webhooks"**
5. You should see a list of webhooks (if any exist)

### Method 2: Alternative Path
If you don't see "Settings" at the top:
1. Go to your repository: `https://github.com/Safester-warrior/SafeSter`
2. Look for a **gear icon (⚙️)** or **"Settings"** button
3. Click it, then look for **"Webhooks"** in the left menu

### Method 3: Direct URL
You can go directly to:
```
https://github.com/Safester-warrior/SafeSter/settings/hooks
```

## What to Look For

### If Webhook Exists:
- You should see a webhook with:
  - **Payload URL:** Something like `https://api.vercel.com/v1/integrations/deploy/...`
  - **Content type:** `application/json`
  - **Recent Deliveries:** Click to see if recent pushes triggered the webhook successfully

### If No Webhook Exists:
- You won't see any webhooks listed
- This means Vercel isn't automatically deploying on git pushes
- You'll need to reconnect the repository in Vercel

## What You Should See

**Webhook Name/Description:**
- May say "Vercel" or "Deploy Hook" or similar

**Recent Deliveries:**
- Click on the webhook to see recent delivery attempts
- Green checkmarks = successful
- Red X = failed
- Look for deliveries from when you just pushed (commit c9b0dd0)

## If You Can't Find Settings Tab

**Possible Reasons:**
1. You don't have admin access to the repository
2. The repository is under an organization and you need permissions
3. You're looking at a fork instead of the main repository

**Solution:**
- Ask the repository owner to check webhooks
- Or check if you have the right permissions

## Quick Check: Does Vercel Auto-Deploy?

**Test:**
1. Make a small change (I can help)
2. Push to GitHub
3. Check Vercel dashboard - does a new deployment start automatically?
   - **YES** = Webhook is working ✅
   - **NO** = Webhook is missing or broken ❌

## Alternative: Check Vercel Side

Instead of checking GitHub, you can check Vercel:
1. Go to Vercel Dashboard → Your Project
2. **Settings** → **Git**
3. Look for:
   - **Connected Repository:** Should show `Safester-warrior/SafeSter`
   - **Production Branch:** Should show `master
   - If there's a "Disconnect" button, the connection exists
   - If you see "Connect Git Repository", it's not connected
