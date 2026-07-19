import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Payment, Programme, ProgrammeFee } from "@prisma/client";
import { getAdminFromCookies } from "@/lib/auth";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { excludeNonTuitionCardHoldersWhere } from "@/lib/admin-openpay-holder";
import { prisma } from "@/lib/prisma";
import { buildStudentProgrammeProgress } from "@/lib/tuition-progress";
import { resolveStudentEnrollmentFromClassStream } from "@/lib/school-structure-server";
import { isValidObjectId } from "@/lib/object-id";
import { loadSchoolOrgContext } from "@/lib/school-org-context";
import { schoolSessionWhere } from "@/lib/school-session-scope";
import { allocateAdmissionNo, studentCardPath } from "@/lib/admission-no";
import { ensureSchoolPayCode } from "@/lib/school-pay-code";
import { appBaseUrl } from "@/lib/root-metadata";

const CreateBody = z
  .object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().optional().default(""),
    telegramId: z.string().optional().default(""),
    admissionNo: z.string().optional(),
    address: z.string().optional(),
    sex: z.enum(["male", "female", "other"]).optional(),
    programmeCode: z.string().min(2).optional(),
    schoolClassId: z.string().optional(),
    schoolStreamId: z.string().optional(),
    year: z.number().int().min(1).max(6),
    semester: z.number().int().min(1).max(3),
    portalPassword: z.string().min(10).max(128).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.email?.trim() && !val.portalPassword?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Portal password (min 10 characters) is required when email is set",
        path: ["portalPassword"],
      });
    }
    // Admission number is auto-allocated when blank; portalPassword alone is fine.
    const hasProgramme = Boolean(val.programmeCode?.trim());
    const hasClassStream = Boolean(val.schoolClassId?.trim() && val.schoolStreamId?.trim());
    if (!hasProgramme && !hasClassStream) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide programmeCode or both schoolClassId and schoolStreamId",
        path: ["programmeCode"],
      });
    }
    if (val.schoolClassId && !isValidObjectId(val.schoolClassId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid schoolClassId", path: ["schoolClassId"] });
    }
    if (val.schoolStreamId && !isValidObjectId(val.schoolStreamId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid schoolStreamId", path: ["schoolStreamId"] });
    }
  });

export async function POST(req: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: admin.sub },
    select: { organizationId: true },
  });
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const organizationId = adminUser.organizationId ?? (await getDefaultOrganizationId());

  const orgMeta = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { institutionTier: true, activeSchoolSessionId: true },
  });
  const schoolSessionId =
    orgMeta?.institutionTier === "school" ? orgMeta.activeSchoolSessionId : null;

  const json = await req.json();
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const requestedAdmission = data.admissionNo?.trim() ?? "";
  let admissionNo = requestedAdmission;
  if (!admissionNo) {
    admissionNo = await allocateAdmissionNo(organizationId);
  }
  const email = (data.email ?? "").trim().toLowerCase();
  const portalPasswordHash = data.portalPassword?.trim()
    ? await bcrypt.hash(data.portalPassword.trim(), 10)
    : undefined;

  const clash = await prisma.student.findFirst({
    where: { organizationId, admissionNo },
    select: { id: true },
  });
  if (clash) {
    // Previewed / concurrent create — allocate a fresh unique number.
    admissionNo = await allocateAdmissionNo(organizationId);
  }

  let programmeCode = data.programmeCode?.trim().toUpperCase() ?? "";
  let schoolClassId: string | undefined;
  let schoolStreamId: string | undefined;

  if (data.schoolClassId?.trim() && data.schoolStreamId?.trim()) {
    const enrollment = await resolveStudentEnrollmentFromClassStream({
      organizationId,
      schoolClassId: data.schoolClassId.trim(),
      schoolStreamId: data.schoolStreamId.trim(),
    });
    programmeCode = enrollment.programmeCode;
    schoolClassId = enrollment.schoolClassId;
    schoolStreamId = enrollment.schoolStreamId;
  }

  if (!programmeCode) {
    return NextResponse.json({ error: "programmeCode is required" }, { status: 400 });
  }

  const doc = await prisma.student.create({
    data: {
      organizationId,
      name: data.name,
      admissionNo,
      email,
      phone: data.phone,
      address: data.address?.trim() ?? "",
      sex: data.sex ?? "other",
      telegramId: data.telegramId,
      programmeCode,
      schoolClassId: schoolClassId ?? null,
      schoolStreamId: schoolStreamId ?? null,
      schoolSessionId,
      year: data.year,
      semester: data.semester,
      ...(portalPasswordHash ? { portalPasswordHash } : {}),
    },
  });

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, slug: true, institutionTier: true },
  });
  const schoolPayCode = await ensureSchoolPayCode(organizationId);
  const base = appBaseUrl();
  const cardUrl = `${base}${studentCardPath(doc.id)}`;

  return NextResponse.json(
    {
      student: {
        id: doc.id,
        name: doc.name,
        admissionNo: doc.admissionNo,
        email: doc.email,
        phone: doc.phone,
        programmeCode: doc.programmeCode,
        year: doc.year,
        semester: doc.semester,
        organizationName: org?.name ?? "",
        organizationSlug: org?.slug ?? "",
        schoolPayCode,
        cardUrl,
        periodLabel: org?.institutionTier === "school" ? "Term" : "Semester",
      },
    },
    { status: 201 },
  );
}

export async function GET(req: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200);
  const organizationSlug = url.searchParams.get("organizationSlug")?.trim().toLowerCase() ?? "";
  const schoolClassId = url.searchParams.get("schoolClassId")?.trim() ?? "";

  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);

  let tenantFilter: { organizationId: string } | Record<string, never> = {};
  if (organizationSlug) {
    if (admin.role !== "master") {
      return NextResponse.json(
        { error: "organizationSlug filter is only available to platform masters" },
        { status: 403 }
      );
    }
    const org = await prisma.organization.findFirst({
      where: { slug: organizationSlug },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Unknown organization slug" }, { status: 400 });
    }
    tenantFilter = { organizationId: org.id };
  }

  let sessionFilter: Record<string, unknown> = {};
  const scopedOrgId =
    "organizationId" in tenantFilter && tenantFilter.organizationId
      ? (tenantFilter.organizationId as string)
      : "organizationId" in orgWhere && orgWhere.organizationId
        ? (orgWhere.organizationId as string)
        : null;
  if (scopedOrgId) {
    const ctx = await loadSchoolOrgContext(scopedOrgId);
    if (ctx) {
      sessionFilter = schoolSessionWhere(ctx.sessionId);
    }
  }

  const students = await prisma.student.findMany({
    where: {
      ...orgWhere,
      ...tenantFilter,
      ...sessionFilter,
      ...excludeNonTuitionCardHoldersWhere(),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
              { admissionNo: { contains: q } },
            ],
          }
        : {}),
      ...(schoolClassId && isValidObjectId(schoolClassId) ? { schoolClassId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      organization: { select: { slug: true, name: true, institutionTier: true } },
      schoolClass: { select: { code: true, name: true } },
      schoolStream: { select: { code: true, name: true } },
    },
  });

  if (students.length === 0) {
    return NextResponse.json({ students: [] });
  }

  /** Batch-load programmes (with fees) + per-student payments so the admin students list shows duration & progress without N+1. */
  const programmeKeys = Array.from(
    new Map(students.map((s) => [`${s.organizationId}::${s.programmeCode}`, { organizationId: s.organizationId, code: s.programmeCode }])).values(),
  );
  const programmes = programmeKeys.length
    ? await prisma.programme.findMany({ where: { OR: programmeKeys }, include: { fees: true } })
    : [];
  const programmeByKey = new Map<string, Programme & { fees: ProgrammeFee[] }>(
    programmes.map((p) => [`${p.organizationId}::${p.code}`, p]),
  );

  const studentIds = students.map((s) => s.id);
  const payments = studentIds.length
    ? await prisma.payment.findMany({ where: { studentId: { in: studentIds } } })
    : [];
  const paymentsByStudent = new Map<string, Payment[]>();
  for (const pay of payments) {
    paymentsByStudent.set(pay.studentId, [...(paymentsByStudent.get(pay.studentId) ?? []), pay]);
  }

  return NextResponse.json({
    students: students.map((s) => {
      const programme = programmeByKey.get(`${s.organizationId}::${s.programmeCode}`) ?? null;
      const progress = programme
        ? buildStudentProgrammeProgress(
            programme,
            (paymentsByStudent.get(s.id) ?? []).filter((p) => p.programmeCode === s.programmeCode),
          )
        : null;
      return {
        id: s.id,
        name: s.name,
        admissionNo: s.admissionNo,
        sex: s.sex,
        address: s.address,
        email: s.email,
        phone: s.phone,
        telegramId: s.telegramId,
        programmeCode: s.programmeCode,
        programmeName: programme?.name ?? null,
        schoolClassId: s.schoolClassId,
        schoolStreamId: s.schoolStreamId,
        schoolClassCode: s.schoolClass?.code ?? null,
        schoolClassName: s.schoolClass?.name ?? null,
        schoolStreamCode: s.schoolStream?.code ?? null,
        schoolStreamName: s.schoolStream?.name ?? null,
        year: s.year,
        semester: s.semester,
        createdAt: s.createdAt,
        organizationSlug: s.organization.slug,
        organizationName: s.organization.name,
        progress,
      };
    }),
  });
}
