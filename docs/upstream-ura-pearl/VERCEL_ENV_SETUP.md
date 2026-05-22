# Quick Fix: Add DATABASE_URL to Vercel

## The Problem
Your build is failing because Vercel needs the `DATABASE_URL` environment variable.

## Quick Fix (2 minutes)

### Step 1: Open Vercel Project Settings
1. Go to: **https://vercel.com/dashboard**
2. Click on your project
3. Click **Settings** (top right)
4. Click **Environment Variables** (left sidebar)

### Step 2: Add DATABASE_URL
1. Click **"Add New"** button
2. Enter:
   - **Name**: `DATABASE_URL`
   - **Value**: Your MongoDB connection string (see below if you don't have it)
   - **Environments**: Check all boxes (Production, Preview, Development)
3. Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Find the failed deployment
3. Click the **three dots** (⋯) menu
4. Click **Redeploy**
5. Make sure **"Use existing Build Cache"** is **OFF**
6. Click **Redeploy**

## If You Don't Have MongoDB URL Yet

You can use a temporary dummy URL just to make the build work:

**Name**: `DATABASE_URL`  
**Value**: `mongodb://localhost:27017/dummy`  
**Environments**: All

⚠️ **Note**: This is just for the build. You'll need a real MongoDB URL for the app to work in production.

## What Your MongoDB URL Should Look Like

If you have MongoDB Atlas:
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

If you have a local MongoDB:
```
mongodb://localhost:27017/clicker-game
```

## After Adding the Variable

1. **Redeploy** (as shown in Step 3 above)
2. The build should now succeed
3. Check the deployment logs to confirm

## Still Not Working?

Share the full error message from Vercel build logs and I'll help you fix it!
