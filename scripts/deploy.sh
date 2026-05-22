#!/usr/bin/env bash
# One-command commit & push → triggers Vercel auto-deploy.
# Usage: npm run deploy
#    or: npm run deploy -- "Your commit message"
#    or: ./scripts/deploy.sh "Your commit message"

set -e
BRANCH="${DEPLOY_BRANCH:-main}"
MSG="${1:-Update}"

git add -A
if git diff --staged --quiet; then
  echo "Nothing to commit. Working tree clean."
  exit 0
fi
git commit -m "$MSG"
git push origin "$BRANCH"
echo "Pushed to origin/$BRANCH — Vercel will auto-deploy."
