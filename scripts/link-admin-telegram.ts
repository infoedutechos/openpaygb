/**
 * Link a tuition admin's personal Telegram user id for Mini App sign-in.
 * Use your id from @userinfobot (positive number) — not a channel id (-100…).
 * Usage: npx tsx scripts/link-admin-telegram.ts master@odelhub.local 123456789
 */import { resolve } from "path";
import { config } from "dotenv";
import { prisma } from "../lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const telegramId = process.argv[3]?.trim();
  if (!email || !telegramId) {
    throw new Error("Usage: npx tsx scripts/link-admin-telegram.ts <email> <telegramId>");
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) throw new Error(`No admin for ${email}`);

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { telegramId },
  });

  // eslint-disable-next-line no-console
  console.log(`Linked ${email} (${admin.role}) → telegramId ${telegramId}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
