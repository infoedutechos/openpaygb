import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config();

if (!process.env.DATABASE_URL?.trim() && process.env.MONGODB_URI?.trim()) {
  process.env.DATABASE_URL = process.env.MONGODB_URI.trim();
}

async function main() {
  const bcrypt = (await import("bcryptjs")).default;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const DATABASE_URL = process.env.DATABASE_URL ?? process.env.MONGODB_URI;
  const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_Admin123!";
  const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@odelhub.local";
  const SEED_MASTER_EMAIL = process.env.SEED_MASTER_EMAIL ?? "master@odelhub.local";
  const SEED_MASTER_PASSWORD = process.env.SEED_MASTER_PASSWORD ?? "ChangeMe_Master123!";
  const SEED_STUDENT_EMAIL = process.env.SEED_STUDENT_EMAIL ?? "student@odelhub.local";
  const SEED_STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD ?? "ChangeMe_Student123!";
  const wallet = process.env.ODELHUB_TON_WALLET_ADDRESS?.trim() ?? "";

  const PROGRAMMES: {
    code: string;
    name: string;
    tuition: number;
    functional: number;
    track: "inservice" | "regular";
  }[] = [
    { code: "BEP-ENG/RE", name: "Bachelor in Education Primary (ENG/RE)", tuition: 450_000, functional: 152_000, track: "inservice" },
    { code: "BEP-ENG/SST", name: "Bachelor in Education Primary (ENG/SST)", tuition: 450_000, functional: 152_000, track: "inservice" },
    { code: "BEP-MTC/SCIE", name: "Bachelor in Education Primary (MTC/SCIE)", tuition: 450_000, functional: 152_000, track: "inservice" },
    { code: "BEP-MTC/AGRIC", name: "Bachelor in Education Primary (MTC/AGRIC)", tuition: 450_000, functional: 152_000, track: "inservice" },
    { code: "DEP-ENG/RE", name: "Diploma in Education Primary (ENG/RE)", tuition: 380_000, functional: 120_000, track: "regular" },
    { code: "DEP-ENG/SST", name: "Diploma in Education Primary (ENG/SST)", tuition: 380_000, functional: 120_000, track: "regular" },
    { code: "DEP-MTC/SCIE", name: "Diploma in Education Primary (MTC/SCIE)", tuition: 380_000, functional: 120_000, track: "regular" },
    { code: "DEP-MTC/AGRIC", name: "Diploma in Education Primary (MTC/AGRIC)", tuition: 380_000, functional: 120_000, track: "regular" },
    { code: "DEP-ECD", name: "DIPLOMA IN EDUCATION –PRIMARY -EARLY CHILDHOOD", tuition: 380_000, functional: 120_000, track: "regular" },
    { code: "DNT", name: "DIPLOMA IN NURSERY TEACHING", tuition: 400_000, functional: 130_000, track: "regular" },
    { code: "CECE", name: "CERTIFICATE IN EARLY CHILDHOOD EDUCATION", tuition: 320_000, functional: 105_000, track: "regular" },
    { code: "CNT", name: "CERTIFICATE IN NURSEY TEACHING", tuition: 320_000, functional: 105_000, track: "regular" },
  ];

  if (!DATABASE_URL) {
    throw new Error("Set DATABASE_URL or MONGODB_URI in .env.local");
  }

  await prisma.payment.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.programmeFee.deleteMany({});
  await prisma.programme.deleteMany({});
  await prisma.fxRate.deleteMany({});
  await prisma.adminUser.deleteMany({});
  await prisma.organization.deleteMany({});

  const { OrganizationTenantStatus, ProgrammeFeeRecurrence, ProgrammeTrack } = await import("@prisma/client");

  const platformFeeUgx = (() => {
    const raw = process.env.CHECKOUT_PLATFORM_FEE_UGX?.trim() ?? "5000";
    const n = Number(raw.replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 5000;
  })();

  const defaultOrg = await prisma.organization.create({
    data: {
      name: "ODEL HUB (default tenant)",
      slug: "default",
      destinationWallet: wallet,
      tenantStatus: OrganizationTenantStatus.active,
      checkoutPlatformFeeUgx: platformFeeUgx,
    },
  });

  await prisma.fxRate.create({
    data: {
      organizationId: defaultOrg.id,
      ugxPerTon: 257_000,
      source: "seed",
      effectiveAt: new Date(),
    },
  });

  for (const p of PROGRAMMES) {
    const prog = await prisma.programme.create({
      data: {
        organizationId: defaultOrg.id,
        code: p.code,
        name: p.name,
        track: p.track === "inservice" ? ProgrammeTrack.inservice : ProgrammeTrack.regular,
      },
    });

    const feeRows: { year: number; semester: number; tuitionUgx: number; functionalFeesUgx: number }[] = [];
    for (let year = 1; year <= 3; year++) {
      for (let semester = 1; semester <= 3; semester++) {
        feeRows.push({
          year,
          semester,
          tuitionUgx: p.tuition,
          functionalFeesUgx: p.functional,
        });
      }
    }

    await prisma.programmeFee.createMany({
      data: feeRows.map((f) => ({
        programmeId: prog.id,
        year: f.year,
        semester: f.semester,
        recurrence: ProgrammeFeeRecurrence.per_semester,
        feeKey: "default",
        tuitionUgx: f.tuitionUgx,
        functionalFeesUgx: f.functionalFeesUgx,
      })),
    });
  }

  const hash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  await prisma.adminUser.create({
    data: {
      email: SEED_ADMIN_EMAIL.toLowerCase(),
      passwordHash: hash,
      name: "School Admin",
      role: "org_admin",
      organizationId: defaultOrg.id,
    },
  });

  const masterHash = await bcrypt.hash(SEED_MASTER_PASSWORD, 10);
  await prisma.adminUser.create({
    data: {
      email: SEED_MASTER_EMAIL.toLowerCase(),
      passwordHash: masterHash,
      name: "Platform Master",
      role: "master",
      organizationId: null,
    },
  });

  const demoProgrammeCode = PROGRAMMES[0]?.code ?? "BEP-ENG/RE";
  const studentPortalHash = await bcrypt.hash(SEED_STUDENT_PASSWORD, 10);
  await prisma.student.create({
    data: {
      organizationId: defaultOrg.id,
      name: "Demo Student",
      email: SEED_STUDENT_EMAIL.toLowerCase(),
      programmeCode: demoProgrammeCode,
      year: 1,
      semester: 1,
      portalPasswordHash: studentPortalHash,
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log("  Tenant slug: default");
  // eslint-disable-next-line no-console
  console.log("  Org admin:", SEED_ADMIN_EMAIL, "/", SEED_ADMIN_PASSWORD);
  // eslint-disable-next-line no-console
  console.log("  Master:", SEED_MASTER_EMAIL, "/", SEED_MASTER_PASSWORD);
  // eslint-disable-next-line no-console
  console.log("  Public pay URL: /pay/default");
  // eslint-disable-next-line no-console
  console.log("  Student portal: /student/login  →  slug: default  email:", SEED_STUDENT_EMAIL, " password:", SEED_STUDENT_PASSWORD);
  // eslint-disable-next-line no-console
  console.log("  Student dashboard after sign-in: /student  or  /my/dashboard");

  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
