# Deploy Using Vercel CLI - Bypass Permissions Issue

## Problem
Manual deployments in Vercel dashboard fail with: "Deployment request did not have a git author with contributing access"

## Solution: Use Vercel CLI

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
- This will open a browser window
- Authorize Vercel CLI
- Make sure you're logged into the correct Vercel account

### Step 3: Link Your Project
```bash
cd c:\Users\BEACON\Desktop\clicker-game
vercel link
```
- Select your existing project
- Or create a new one if needed

### Step 4: Deploy to Production
```bash
vercel --prod
```
- This will deploy the latest commit from your current branch
- Bypasses the permissions issue
- Uses your CLI authentication instead

## Alternative: Fix Permissions in Vercel Dashboard

### Option A: Add Yourself as Team Member
1. Vercel Dashboard → Your Project → **Settings** → **Team** (or **Members**)
2. Click **"Invite"** or **"Add Member"**
3. Add your email: `maglipofficial@gmail.com`
4. Give yourself **"Developer"** or **"Owner"** role
5. Save

### Option B: Check Project Ownership
1. Vercel Dashboard → **Settings** (top right, account settings)
2. Check which account/team owns the project
3. Make sure you're logged into the correct account
4. If project is under a team, ask team owner to add you

### Option C: Transfer Project to Your Account
1. Vercel Dashboard → Your Project → **Settings** → **General**
2. Look for **"Transfer Project"** or **"Change Owner"**
3. Transfer to your personal account

## Quick CLI Deployment Commands

```bash
# Install CLI (if not installed)
npm install -g vercel

# Login
vercel login

# Link project (first time only)
vercel link

# Deploy to production
vercel --prod

# Deploy specific commit (if needed)
git checkout 19bcb36
vercel --prod
```

## What Happens After CLI Deploy

1. Vercel CLI will build your project
2. Upload to Vercel
3. Deploy to production
4. You'll get a deployment URL
5. All your changes (AfroLumens, ranks) will be live
