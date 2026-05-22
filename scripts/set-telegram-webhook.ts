import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config();

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const base =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}` : "") ||
  "http://localhost:3000";

const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? process.env.TELEGRAM_SECRET_TOKEN ?? "";

async function main() {
  if (!token) {
    throw new Error("Set TELEGRAM_BOT_TOKEN in .env.local");
  }

  const url = `${base.replace(/\/$/, "")}/api/webhooks/telegram`;
  const params = new URLSearchParams();
  params.set("url", url);
  if (secret.trim()) {
    params.set("secret_token", secret.trim());
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const j = (await res.json()) as { ok?: boolean; description?: string; result?: unknown };
  if (!j.ok) {
    throw new Error(j.description ?? "setWebhook failed");
  }

  // eslint-disable-next-line no-console
  console.log("Webhook set to:", url);
  if (secret.trim()) {
    // eslint-disable-next-line no-console
    console.log("secret_token enabled — Telegram will send X-Telegram-Bot-Api-Secret-Token");
  }
  // eslint-disable-next-line no-console
  console.log("Result:", j.result);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
