import { resolve } from "path";
import { config } from "dotenv";
import { prisma } from "../lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config();

async function main() {
  const admins = await prisma.adminUser.findMany({
    where: {
      OR: [
        { role: "master" },
        { email: { contains: "oiptech", mode: "insensitive" } },
        { email: "master@odelhub.local" },
      ],
    },
    select: { id: true, email: true, role: true, telegramId: true, name: true },
    orderBy: { email: "asc" },
  });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(admins, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
