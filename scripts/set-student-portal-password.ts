import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}

async function main() {
  const orgSlug = (process.argv[2] ?? process.env.STUDENT_ORG_SLUG ?? "default").trim().toLowerCase();
  const email = (process.argv[3] ?? process.env.SEED_STUDENT_EMAIL ?? "student@odelhub.local")
    .trim()
    .toLowerCase();
  const password = process.argv[4] ?? process.env.SEED_STUDENT_PASSWORD ?? "ChangeMe_Student123!";

  if (!email.includes("@")) {
    throw new Error("Usage: npx tsx scripts/set-student-portal-password.ts [orgSlug] [email] [password]");
  }
  if (typeof password !== "string" || password.length < 10) {
    throw new Error("Password must be at least 10 characters");
  }

  const bcrypt = (await import("bcryptjs")).default;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
    if (!org) {
      throw new Error(`Organization not found for slug: ${orgSlug}`);
    }

    const students = await prisma.student.findMany({
      where: { organizationId: org.id, email },
      select: { id: true, name: true, portalPasswordHash: true },
    });

    if (students.length === 0) {
      throw new Error(`No student with email ${email} in org ${orgSlug}`);
    }
    if (students.length > 1) {
      throw new Error(`Multiple students share ${email} in org ${orgSlug}`);
    }

    const portalPasswordHash = await bcrypt.hash(password, 10);
    await prisma.student.update({
      where: { id: students[0].id },
      data: { portalPasswordHash },
    });

    // eslint-disable-next-line no-console
    console.log(`Portal password set for ${students[0].name ?? email} (${orgSlug})`);
    // eslint-disable-next-line no-console
    console.log(`  Sign in: /student/login  school=${orgSlug}  email=${email}`);
    if (students[0].portalPasswordHash) {
      // eslint-disable-next-line no-console
      console.log("  (Replaced an existing portal password.)");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
