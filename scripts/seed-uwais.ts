/**
 * Provision Uwais Qur'an Memorisation & Junior School as an OdelPay Schools tenant
 * and import the sample spreadsheet-style fee ledger.
 *
 * Usage: npx tsx scripts/seed-uwais.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}

const UWAIS_SLUG = "uwais";
const UWAIS_NAME = "Uwais Qur'an Memorisation & Junior School";

async function main() {
  const bcrypt = (await import("bcryptjs")).default;
  const { PrismaClient, InstitutionTier, OrganizationTenantStatus } = await import("@prisma/client");
  const { provisionSchoolErpDefaults } = await import("../lib/school-org-provision");
  const { importFeeLedgerRows, parseFeeLedgerCsv } = await import("../lib/school-fee-ledger-import");
  const { ensureFeeLedgerAccounts } = await import("../lib/school-fee-ledger-accounts");

  const prisma = new PrismaClient();
  const DATABASE_URL = process.env.DATABASE_URL ?? process.env.MONGODB_URI;
  if (!DATABASE_URL) throw new Error("Set DATABASE_URL or MONGODB_URI in .env.local");

  const wallet = process.env.ODELHUB_TON_WALLET_ADDRESS?.trim() ?? "";
  const adminEmail = (process.env.SEED_UWAIS_ADMIN_EMAIL ?? "uwais.admin@odelhub.local").toLowerCase();
  const adminPassword = process.env.SEED_UWAIS_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_Admin123!";

  let org = await prisma.organization.findUnique({ where: { slug: UWAIS_SLUG } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: UWAIS_NAME,
        slug: UWAIS_SLUG,
        destinationWallet: wallet,
        tenantStatus: OrganizationTenantStatus.active,
        institutionTier: InstitutionTier.school,
        currentAcademicYearLabel: "2025/2026",
        activeSchoolTerm: 2,
        admissionFormatConfigured: true,
        admissionPrefix: "UQS",
        admissionIncludeYear: true,
        admissionYearSource: "calendar",
        admissionSeqDigits: 3,
        admissionSeparator: "-",
        admissionSeqStart: 1,
        schoolPayCode: String(100_000 + Math.floor(Math.random() * 900_000)),
        letterheadPhone: "",
        letterheadEmail: "finance@uwais.local",
        letterheadAddress: "Uwais Qur'an Memorisation & Junior School",
        registrationContactEmail: adminEmail,
      },
    });
    // eslint-disable-next-line no-console
    console.log("Created organization", org.slug);
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: UWAIS_NAME,
        institutionTier: InstitutionTier.school,
        tenantStatus: OrganizationTenantStatus.active,
        admissionFormatConfigured: true,
        admissionPrefix: "UQS",
        admissionSeqDigits: 3,
        activeSchoolTerm: 2,
        currentAcademicYearLabel: org.currentAcademicYearLabel || "2025/2026",
        ...(org.schoolPayCode?.trim()
          ? {}
          : { schoolPayCode: String(100_000 + Math.floor(Math.random() * 900_000)) }),
      },
    });
    // eslint-disable-next-line no-console
    console.log("Updated organization", org.slug);
  }

  await provisionSchoolErpDefaults(org.id);
  await ensureFeeLedgerAccounts(org.id);
  const schoolPayCode = org.schoolPayCode || (await prisma.organization.findUnique({ where: { id: org.id } }))?.schoolPayCode || "";


  const hash = await bcrypt.hash(adminPassword, 10);
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        name: "Uwais School Admin",
        role: "org_admin",
        organizationId: org.id,
      },
    });
  } else {
    await prisma.adminUser.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash: hash,
        name: "Uwais School Admin",
        role: "org_admin",
        organizationId: org.id,
      },
    });
  }

  const csvPath = resolve(process.cwd(), "data/uwais-fee-ledger-sample.csv");
  const csv = readFileSync(csvPath, "utf8");
  const rows = parseFeeLedgerCsv(csv, 2);
  const importResult = await importFeeLedgerRows({
    organizationId: org.id,
    rows,
    skipExistingPayments: true,
  });

  // eslint-disable-next-line no-console
  console.log("Uwais seed complete.");
  // eslint-disable-next-line no-console
  console.log("  Slug:", UWAIS_SLUG);
  // eslint-disable-next-line no-console
  console.log("  School Pay Code:", schoolPayCode);
  // eslint-disable-next-line no-console
  console.log("  Admin:", adminEmail, "/", adminPassword, "→ /admin/login?school=1");
  // eslint-disable-next-line no-console
  console.log("  Fee ledger:", "/admin/fee-ledger (sign in as Uwais admin)");
  // eslint-disable-next-line no-console
  console.log("  Checkout:", `/pay/${UWAIS_SLUG}`);
  // eslint-disable-next-line no-console
  console.log("  Import:", importResult);

  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
