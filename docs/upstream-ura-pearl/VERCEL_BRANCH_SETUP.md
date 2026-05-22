# How to Set Production Branch in Vercel Dashboard

## Method 1: Via Vercel Dashboard (Step-by-Step)

### Step 1: Go to Your Project
1. Open your browser and go to: **https://vercel.com/dashboard**
2. Make sure you're logged in as **safesterwarrior-3280**
3. Find and click on your project (likely **"clicker"** or **"afrolumens"**)

### Step 2: Navigate to Settings
1. Once inside your project, look at the top navigation bar
2. Click on **"Settings"** (it's usually the rightmost tab)
3. You should see a left sidebar with different setting categories

### Step 3: Find Git Settings
1. In the left sidebar under Settings, look for **"Git"**
2. Click on **"Git"** - this opens the Git integration settings

### Step 4: Check Current Repository Connection
1. You should see:
   - **"Connected Git Repository"** section showing `maglip/clicker-game` (or another repo)
   - **"Production Branch"** field (this is what you need to change!)

### Step 5: Change Production Branch
1. Scroll down to find **"Production Branch"** field
2. Click on the dropdown or text field next to "Production Branch"
3. Type or select: **`deploy-afrolumens-v1`**
4. Click **"Save"** button (usually at the bottom of the page)

### Step 6: Alternative - If You Don't See "Production Branch"
If you don't see a "Production Branch" setting, try this:

1. Go to **Settings** → **General**
2. Look for **"Production Branch"** or **"Git Branch"**
3. Or go to **Settings** → **Deployments**
4. Look for branch configuration there

### Step 7: If Repository is NOT Connected
If you see "No Git Repository Connected":

1. Click **"Connect Git Repository"** button
2. You'll see a list of your GitHub repositories
3. Find and select: **`maglip/clicker-game`**
4. Click **"Import"** or **"Connect"**
5. After connecting, you should see the Production Branch option

## Method 2: Via Vercel CLI (Easier!)

If the dashboard is confusing, use the command line:

```powershell
# Make sure you're in the project directory
cd c:\Users\BEACON\Desktop\clicker-game

# Link to the correct project (if not already linked)
vercel link

# Deploy directly from the new branch
vercel --prod
```

## Method 3: Create New Deployment Manually

1. Go to your project in Vercel dashboard
2. Click on **"Deployments"** tab (top navigation)
3. Click **"Create Deployment"** button (usually top right)
4. In the deployment dialog:
   - **Git Repository**: Select `maglip/clicker-game`
   - **Branch**: Select `deploy-afrolumens-v1`
   - **Build Cache**: Turn OFF
   - Click **"Deploy"**

## What to Look For

When you're in Settings → Git, you should see something like:

```
Connected Git Repository
github.com/maglip/clicker-game

Production Branch
[deploy-afrolumens-v1 ▼]  ← This dropdown/field
```

## Still Can't Find It?

If you still can't find the Production Branch setting:

1. **Take a screenshot** of your Settings → Git page and share it
2. Or tell me which project name you're using (clicker, afrolumens, or safe-ster)
3. I can provide more specific guidance based on what you see

## Quick Check: Which Project Should You Use?

Based on your projects:
- **clicker** - https://clicker-nine-inky.vercel.app
- **afrolumens** - https://afrolumens-safetys-projects-41d12c22.vercel.app
- **safe-ster** - https://safe-ster.vercel.app

Which one is your main project? That's the one you need to configure!
