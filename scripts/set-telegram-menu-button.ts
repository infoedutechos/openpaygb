import { resolve } from "path";
import { config } from "dotenv";
import { getTmaAppUrl } from "../lib/telegram/tma-url";

config({ path: resolve(process.cwd(), ".env.local") });
config();

const token = process.env.BOT_TOKEN?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim();

async function main() {
  if (!token) throw new Error("Set BOT_TOKEN or TELEGRAM_BOT_TOKEN");

  const menuUrl = getTmaAppUrl();
  const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      menu_button: {
        type: "web_app",
        text: "Open App",
        web_app: { url: menuUrl },
      },
    }),
  });
  const j = (await res.json()) as { ok?: boolean; description?: string };
  if (!j.ok) throw new Error(j.description ?? "setChatMenuButton failed");
  // eslint-disable-next-line no-console
  console.log("Menu button Web App URL:", menuUrl);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
