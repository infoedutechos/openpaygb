import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config();

const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://odelpay.vercel.app").replace(/\/$/, "");
const secret = process.env.CRON_SECRET?.trim();

async function main() {
  const checks = {
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    TELEGRAM_BOT_TOKEN: Boolean(
      (process.env.TELEGRAM_BOT_TOKEN ?? process.env.BOT_TOKEN)?.trim(),
    ),
    CRON_SECRET: Boolean(secret),
  };
  // eslint-disable-next-line no-console
  console.log("Env present:", checks);

  if (!secret) {
    // eslint-disable-next-line no-console
    console.log("Skip cron smoke — set CRON_SECRET in .env.local to test production endpoint.");
    return;
  }

  const url = `${base}/api/cron/telegram-tuition-reminders`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  // eslint-disable-next-line no-console
  console.log(`GET ${url} → ${res.status}`);
  // eslint-disable-next-line no-console
  console.log(body.slice(0, 500));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
