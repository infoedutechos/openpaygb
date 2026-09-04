/** Smoke: prisma.adminUser after DNS/SRV fix. */
import { prisma } from "../lib/prisma";

async function main() {
  const n = await prisma.adminUser.count();
  console.log("adminUser.count", n);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("SMOKE_FAIL", e instanceof Error ? e.message : e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
