/**
 * Ensure platform master email + Telegram id for Mini App sign-in.
 * Usage: npx tsx scripts/ensure-master-telegram.ts oiptechcore@gmail.com 711716655
 */
import { resolve } from "path";
import { config } from "dotenv";
import { prisma } from "../lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const telegramId = process.argv[3]?.trim();
  if (!email || !telegramId) {
    throw new Error("Usage: npx tsx scripts/ensure-master-telegram.ts <email> <telegramId>");
  }

  const target = await prisma.adminUser.findUnique({ where: { email } });
  if (!target) {
    throw new Error(`No admin for ${email}. Create the account first or run npm run admin:ensure / seed.`);
  }

  const masters = await prisma.adminUser.findMany({
    where: { role: "master" },
    select: { id: true, email: true, telegramId: true },
  });

  const othersWithSameTg = await prisma.adminUser.findMany({
    where: { telegramId, id: { not: target.id } },
    select: { id: true, email: true },
  });

  for (const row of othersWithSameTg) {
    await prisma.adminUser.update({
      where: { id: row.id },
      data: { telegramId: "" },
    });
    // eslint-disable-next-line no-console
    console.log(`Cleared telegramId on ${row.email}`);
  }

  for (const m of masters) {
    if (m.id === target.id) continue;
    await prisma.adminUser.update({
      where: { id: m.id },
      data: { role: "org_admin", telegramId: "" },
    });
    // eslint-disable-next-line no-console
    console.log(`Demoted former master ${m.email} → org_admin`);
  }

  await prisma.adminUser.update({
    where: { id: target.id },
    data: { role: "master", telegramId, organizationId: null },
  });

  // eslint-disable-next-line no-console
  console.log(`Master set: ${email} → telegramId ${telegramId}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
