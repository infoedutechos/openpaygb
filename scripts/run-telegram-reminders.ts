/**
 * Trigger tuition due reminders via the cron API (local dev server or production).
 * Requires NEXT_PUBLIC_APP_URL; sends CRON_SECRET when set.
 */
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config();

async function main() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET?.trim();
  const url = `${base}/api/cron/telegram-tuition-reminders`;
  const headers: Record<string, string> = {};
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const res = await fetch(url, { headers });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* plain text */
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ status: res.status, url, body }, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
