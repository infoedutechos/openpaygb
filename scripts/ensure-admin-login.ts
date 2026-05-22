import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@odelhub.local").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_Admin123!";

  if (!email.includes("@")) {
    throw new Error("Set a valid SEED_ADMIN_EMAIL in .env or .env.local");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Set SEED_ADMIN_PASSWORD (minimum 8 characters) in .env or .env.local");
  }

  const bcrypt = (await import("bcryptjs")).default;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const orgAdmins = await prisma.adminUser.findMany({ where: { role: "org_admin" } });

    if (orgAdmins.length > 1) {
      throw new Error(
        'More than one user has role "org_admin". Leave a single org admin or run npm run seed after backup.',
      );
    }

    if (orgAdmins.length === 0) {
      let org = await prisma.organization.findFirst({ where: { slug: "default" } });
      if (!org) {
        const wallet = process.env.ODELHUB_TON_WALLET_ADDRESS?.trim() ?? "";
        const { OrganizationTenantStatus } = await import("@prisma/client");
        const platformFeeUgx = (() => {
          const raw = process.env.CHECKOUT_PLATFORM_FEE_UGX?.trim() ?? "5000";
          const n = Number(raw.replace(/,/g, ""));
          return Number.isFinite(n) && n >= 0 ? Math.round(n) : 5000;
        })();
        org = await prisma.organization.create({
          data: {
            name: "ODEL HUB (default tenant)",
            slug: "default",
            destinationWallet: wallet,
            tenantStatus: OrganizationTenantStatus.active,
            checkoutPlatformFeeUgx: platformFeeUgx,
          },
        });
        // eslint-disable-next-line no-console
        console.log("Created default organization (slug: default)");
      }

      await prisma.adminUser.create({
        data: {
          email,
          passwordHash,
          name: "School Admin",
          role: "org_admin",
          organizationId: org.id,
        },
      });
      // eslint-disable-next-line no-console
      console.log("Created org admin:", email);
    } else {
      const conflicting = await prisma.adminUser.findFirst({
        where: { email, id: { not: orgAdmins[0].id } },
      });
      if (conflicting) {
        throw new Error(`Email ${email} is already used by another admin (id ${conflicting.id}).`);
      }
      await prisma.adminUser.update({
        where: { id: orgAdmins[0].id },
        data: { email, passwordHash },
      });
      // eslint-disable-next-line no-console
      console.log("Updated org admin login:", email);
    }

    // eslint-disable-next-line no-console
    console.log("Sign in at /admin/login with the email and SEED_ADMIN_PASSWORD from .env.local (overrides .env).");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
