# Fix Vercel Build Failure

## Problem
Build is failing with: `Command "npm run vercel-build" exited with 1`

## Solution: Add DATABASE_URL Environment Variable

### Step 1: Get Your MongoDB Connection String
You need your MongoDB connection string. It should look like:
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Step 2: Add Environment Variable in Vercel

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Click on your project (clicker, afrolumens, or safe-ster)
3. Click **Settings** (top navigation)
4. Click **Environment Variables** (left sidebar)
5. Click **Add New** button
6. Fill in:
   - **Key**: `DATABASE_URL`
   - **Value**: Your MongoDB connection string
   - **Environment**: Select all (Production, Preview, Development)
7. Click **Save**
8. **IMPORTANT**: After adding, you need to **redeploy** for the variable to take effect

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Make sure **"Use existing Build Cache"** is **OFF**
5. Click **Redeploy**

## Alternative: If You Don't Have DATABASE_URL Yet

If you don't have a MongoDB connection string yet, you can temporarily use a dummy one for the build (Prisma generate doesn't actually connect):

1. In Vercel Environment Variables, add:
   - **Key**: `DATABASE_URL`
   - **Value**: `mongodb://localhost:27017/dummy` (this won't actually connect, but allows the build to proceed)
   - **Environment**: All

2. After you get your real MongoDB URL, update it with the real connection string.

## Verify Build Works

After adding DATABASE_URL and redeploying, check the build logs. You should see:
- ✅ `prisma generate` completes successfully
- ✅ `next build` completes successfully
- ✅ Build succeeds

## Still Failing?

If it still fails after adding DATABASE_URL:

1. Check the **full build logs** in Vercel
2. Look for the specific error message
3. Share the error with me and I'll help fix it
