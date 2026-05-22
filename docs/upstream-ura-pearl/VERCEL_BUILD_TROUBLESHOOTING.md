# Vercel Build Failure Troubleshooting Guide

## Current Status
- ✅ Prisma generate completed successfully (DATABASE_URL is set)
- ❌ `next build` is failing with exit code 1
- ⚠️ Build log is truncated - need full error message

## Step 1: Get the Full Error Message

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Click on your project
3. Click on the **failed deployment**
4. Scroll down to see the **full build logs**
5. Look for the error message after "Creating an optimized production build ..."
6. Copy the complete error message

## Common Build Failure Causes

### 1. Missing NEXT_PUBLIC_ Environment Variables

Your code uses these client-side environment variables that must be set in Vercel:

**Required Variables:**
- `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH` (used in `components/Loading.tsx`)
- `NEXT_PUBLIC_BOT_USERNAME` (used in `components/Loading.tsx`)
- `NEXT_PUBLIC_CHANNEL_LINK` (if used)

**How to Add:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable:
   - **Key**: `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH`
   - **Value**: `true` (or `false`)
   - **Environments**: All (Production, Preview, Development)
3. Repeat for `NEXT_PUBLIC_BOT_USERNAME` (value: `safestersbot`)
4. Click **Save**
5. **Redeploy** (Deployments → Three dots → Redeploy → Turn OFF cache)

### 2. TypeScript Compilation Errors

Check for TypeScript errors in the build logs. Common issues:
- Missing type definitions
- Type mismatches
- Import errors

**Fix:** Look for lines starting with `error TS` in the build logs.

### 3. Import/Module Resolution Issues

Check for errors like:
- `Cannot find module`
- `Module not found`
- `Failed to resolve import`

**Fix:** Verify all imports use correct paths and all dependencies are in `package.json`.

### 4. Server-Side Code in Client Components

If server-only code (like `crypto`, `fs`, etc.) is imported in client components, it will fail.

**Fix:** Ensure `'use client'` components don't import server-only modules.

## Complete Environment Variables Checklist

Make sure these are set in Vercel (Settings → Environment Variables):

### Required for Build:
- ✅ `DATABASE_URL` (already set - Prisma generate succeeded)

### Required for Client-Side:
- ⚠️ `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH` (set to `true` or `false`)
- ⚠️ `NEXT_PUBLIC_BOT_USERNAME` (set to `safestersbot`)
- ⚠️ `NEXT_PUBLIC_CHANNEL_LINK` (if used)

### Required for Server-Side (Runtime):
- `BOT_TOKEN`
- `ACCESS_ADMIN`
- `TONCENTER_API_KEY`
- `BYPASS_TELEGRAM_AUTH`

**Note:** Server-side variables don't need to be set for the build to succeed, but they're needed for the app to work.

## Quick Fix Steps

1. **Add Missing NEXT_PUBLIC_ Variables:**
   ```
   NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH=true
   NEXT_PUBLIC_BOT_USERNAME=safestersbot
   ```

2. **Redeploy:**
   - Go to Deployments tab
   - Click three dots (⋯) on latest deployment
   - Click Redeploy
   - Turn OFF "Use existing Build Cache"
   - Click Redeploy

3. **Check Build Logs:**
   - If it still fails, scroll to the bottom of the build logs
   - Look for the actual error message
   - Share the error with me

## Still Failing?

If the build still fails after adding environment variables:

1. **Get the full error message** from Vercel build logs
2. **Check for TypeScript errors** (look for `error TS`)
3. **Check for import errors** (look for `Cannot find module`)
4. **Share the complete error message** and I'll help fix it

## Files That Use Environment Variables

- `components/Loading.tsx` - Uses `NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH` and `NEXT_PUBLIC_BOT_USERNAME`
- `utils/server-checks.ts` - Uses `BOT_TOKEN` and `BYPASS_TELEGRAM_AUTH` (server-side only)
- `app/api/**/*.ts` - Various API routes use server-side env vars
