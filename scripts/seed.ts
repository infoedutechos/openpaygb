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

  const { InstitutionTier, PaymentRail, PaymentStatus } = await import("@prisma/client");

  const defaultOrg = await prisma.organization.create({
    data: {
      name: "TEAM UNIVERSITY 2023/2025 (demo)",
      slug: "default",
      destinationWallet: wallet,
      tenantStatus: OrganizationTenantStatus.active,
      institutionTier: InstitutionTier.university,
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

  const schoolOrg = await prisma.organization.create({
    data: {
      name: "Riverside Academy (demo school)",
      slug: "riverside-demo",
      destinationWallet: wallet,
      tenantStatus: OrganizationTenantStatus.active,
      institutionTier: InstitutionTier.school,
      checkoutPlatformFeeUgx: platformFeeUgx,
    },
  });

  const schoolAdminHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  await prisma.adminUser.create({
    data: {
      email: "school.admin@odelhub.local",
      passwordHash: schoolAdminHash,
      name: "Riverside School Admin",
      role: "org_admin",
      organizationId: schoolOrg.id,
    },
  });

  const schoolStudentHash = await bcrypt.hash(SEED_STUDENT_PASSWORD, 10);
  await prisma.student.create({
    data: {
      organizationId: schoolOrg.id,
      name: "Amina Okello (demo)",
      email: "school.student@odelhub.local",
      programmeCode: "P7-STREAM",
      year: 1,
      semester: 1,
      portalPasswordHash: schoolStudentHash,
    },
  });

  const schoolProg = await prisma.programme.create({
    data: {
      organizationId: schoolOrg.id,
      code: "P7-STREAM",
      name: "Primary Seven",
      track: ProgrammeTrack.regular,
      semestersPerYear: 3,
    },
  });

  await prisma.programmeFee.createMany({
    data: [1, 2, 3].map((term) => ({
      programmeId: schoolProg.id,
      year: 1,
      semester: term,
      recurrence: ProgrammeFeeRecurrence.per_semester,
      feeKey: "tuition",
      tuitionUgx: 350_000,
      functionalFeesUgx: 45_000,
    })),
  });

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
  const demoStudent = await prisma.student.create({
    data: {
      organizationId: defaultOrg.id,
      name: "Nabiddo Rehema Mbuga",
      email: SEED_STUDENT_EMAIL.toLowerCase(),
      programmeCode: demoProgrammeCode,
      year: 1,
      semester: 1,
      portalPasswordHash: studentPortalHash,
    },
  });

  const demoProgramme = await prisma.programme.findFirst({
    where: { organizationId: defaultOrg.id, code: demoProgrammeCode },
    include: { fees: true },
  });
  const ugxPerTon = 257_000;
  let demoReceiptPath = "";

  if (demoProgramme) {
    const sem1Fees = demoProgramme.fees.filter((f) => f.year === 1 && f.semester === 1);
    const feeIds = sem1Fees.map((f) => f.id);
    const tuition = sem1Fees.reduce((s, f) => s + f.tuitionUgx, 0);
    const functional = sem1Fees.reduce((s, f) => s + f.functionalFeesUgx, 0);
    const scheduleSubtotal = tuition + functional;

    const payment1 = await prisma.payment.create({
      data: {
        organizationId: defaultOrg.id,
        studentId: demoStudent.id,
        programmeCode: demoProgrammeCode,
        year: 1,
        semester: 1,
        tuitionUgx: tuition,
        functionalFeesUgx: functional,
        totalUgx: 472_000,
        ugxPerTonSnapshot: ugxPerTon,
        tonAmount: 472_000 / ugxPerTon,
        destinationWallet: wallet,
        rail: PaymentRail.livepay,
        status: PaymentStatus.confirmed,
        momoReference: "KCB-4297",
        includedFeeIds: feeIds,
        installmentCount: 2,
        installmentIndex: 1,
        installmentScheduleSubtotalUgx: scheduleSubtotal,
        confirmedAt: new Date("2023-08-01T10:00:00Z"),
      },
    });

    const payment2 = await prisma.payment.create({
      data: {
        organizationId: defaultOrg.id,
        studentId: demoStudent.id,
        programmeCode: demoProgrammeCode,
        year: 1,
        semester: 1,
        tuitionUgx: tuition,
        functionalFeesUgx: functional,
        totalUgx: scheduleSubtotal - 472_000,
        ugxPerTonSnapshot: ugxPerTon,
        tonAmount: (scheduleSubtotal - 472_000) / ugxPerTon,
        destinationWallet: wallet,
        rail: PaymentRail.livepay,
        status: PaymentStatus.confirmed,
        momoReference: "KCB-7787",
        includedFeeIds: feeIds,
        installmentCount: 2,
        installmentIndex: 2,
        installmentScheduleSubtotalUgx: scheduleSubtotal,
        confirmedAt: new Date("2024-01-15T10:00:00Z"),
      },
    });

    demoReceiptPath = `/receipt/${payment2.id}`;
  }

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
  console.log("");
  console.log("  Local seed quick reference:");
  console.log("    School checkout: /pay/riverside-demo");
  console.log("    School admin: school.admin@odelhub.local /", SEED_ADMIN_PASSWORD, "→ /admin/login?school=1");
  console.log("    School student: school.student@odelhub.local /", SEED_STUDENT_PASSWORD, "→ /student/login (slug riverside-demo)");
  console.log("    University student:", SEED_STUDENT_EMAIL, "/", SEED_STUDENT_PASSWORD, "→ /student/login (slug default)");
  console.log("  OdelPay Schools lobby: /OdelPaySchools");
  // eslint-disable-next-line no-console
  console.log("  Student dashboard after sign-in: /student  or  /my/dashboard");
  if (demoReceiptPath) {
    // eslint-disable-next-line no-console
    console.log("  Demo ledger receipt (TEAM UNIVERSITY format):", demoReceiptPath);
    // eslint-disable-next-line no-console
    console.log("  Open as student or admin after sign-in, or use receipt token from payment email flow.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
