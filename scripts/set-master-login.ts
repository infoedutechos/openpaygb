import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}

async function main() {
  const email = process.env.SEED_MASTER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_MASTER_PASSWORD;

  if (!email || !email.includes("@")) {
    throw new Error("Set a valid SEED_MASTER_EMAIL in .env.local");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Set SEED_MASTER_PASSWORD in .env.local (minimum 8 characters)");
  }

  const bcrypt = (await import("bcryptjs")).default;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const masters = await prisma.adminUser.findMany({ where: { role: "master" } });

    if (masters.length > 1) {
      throw new Error(
        "More than one user has role \"master\". Leave a single master in the database and run again.",
      );
    }

    if (masters.length === 0) {
      await prisma.adminUser.create({
        data: {
          email,
          passwordHash,
          name: "Platform Master",
          role: "master",
          organizationId: null,
        },
      });
      // eslint-disable-next-line no-console
      console.log("Created master admin:", email);
    } else {
      const conflicting = await prisma.adminUser.findFirst({
        where: { email, id: { not: masters[0].id } },
      });
      if (conflicting) {
        throw new Error(`Email ${email} is already used by another admin (id ${conflicting.id}).`);
      }
      await prisma.adminUser.update({
        where: { id: masters[0].id },
        data: { email, passwordHash },
      });
      // eslint-disable-next-line no-console
      console.log("Updated master login:", email);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
