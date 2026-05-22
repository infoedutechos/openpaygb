# Authenticate and Push to Private Repository

## Since the repository is private, you need to authenticate

### Option 1: Use GitHub Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it: "Vercel Deployment"
   - Select scopes: Check `repo` (full control of private repositories)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again!)

2. **Use the token to push:**
   ```bash
   cd c:\Users\BEACON\Desktop\clicker-game
   git remote set-url origin https://YOUR_TOKEN@github.com/maglip/clicker-game.git
   git push -u origin fix/update-referral-links
   ```
   Replace `YOUR_TOKEN` with the token you just created.

### Option 2: Use GitHub Credential Manager

Windows should have Git Credential Manager. Try:
```bash
cd c:\Users\BEACON\Desktop\clicker-game
git remote set-url origin https://github.com/maglip/clicker-game.git
git push -u origin fix/update-referral-links
```

When prompted:
- Username: `maglip` (or your GitHub username)
- Password: Use your Personal Access Token (NOT your GitHub password)

### Option 3: Use SSH (If you have SSH keys set up)

```bash
git remote set-url origin git@github.com:maglip/clicker-game.git
git push -u origin fix/update-referral-links
```

## Quick Steps (Recommended)

1. Create token at: https://github.com/settings/tokens
2. Copy the token
3. Run:
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/maglip/clicker-game.git
   git push -u origin fix/update-referral-links
   ```

## After Pushing

1. Verify at: https://github.com/maglip/clicker-game/tree/fix/update-referral-links
2. All your changes should be there:
   - ✅ "Welcome to AfroLumens"
   - ✅ "Loading AfroLumens"
   - ✅ All 9 ranks updated
3. Then connect Vercel to this repository and branch
