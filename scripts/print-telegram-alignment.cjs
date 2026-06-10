/**
 * Print Telegram bot token + webhook alignment (no secret values).
 * Run: npm run telegram:alignment-check
 */
const { config } = require("dotenv");
const { resolve } = require("node:path");

config({ path: resolve(process.cwd(), ".env.local") });
config();

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://odelpay.vercel.app").replace(/\/$/, "");
const botToken = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "").trim();
const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
const botUsername = (process.env.NEXT_PUBLIC_BOT_USERNAME || "").replace(/^@/, "");

console.log("Telegram bot alignment checklist");
console.log("================================");
console.log(`App URL:          ${appUrl}`);
console.log(`Bot username:     ${botUsername ? `@${botUsername}` : "(set NEXT_PUBLIC_BOT_USERNAME)"}`);
console.log(`BOT_TOKEN set:    ${Boolean(process.env.BOT_TOKEN?.trim()) ? "YES" : "no"}`);
console.log(`TELEGRAM_BOT_TOKEN: ${Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()) ? "YES" : "no"}`);
console.log(`Any bot token:    ${botToken ? "YES" : "NO — paste BotFather token in Master → Deployment environment"}`);
console.log(`Webhook URL:      ${appUrl}/api/webhooks/telegram`);
console.log(`Webhook secret:   ${webhookSecret ? "YES (optional)" : "not set (optional)"}`);
console.log("");
console.log("Master Admin: /admin/master#deployment-environment → Telegram group → Save → Sync to Vercel");
console.log("Set webhook:  npm run telegram:set-webhook");
console.log("Docs:         docs/TELEGRAM_BOT_DEPLOYMENT.md");
console.log("API:          GET /api/public/telegram-config");

process.exit(botToken ? 0 : 1);
