import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { isValidObjectId } from "@/lib/object-id";
import { buildStudentProgrammeProgress, getProgrammeDurationSummary } from "@/lib/tuition-progress";
import { resolveStudentEnrollmentFromClassStream } from "@/lib/school-structure-server";

const PatchBody = z
  .object({
    programmeCode: z.string().min(2).optional(),
    schoolClassId: z.string().optional(),
    schoolStreamId: z.string().optional(),
    year: z.number().int().min(1).max(6).optional(),
    semester: z.number().int().min(1).max(3).optional(),
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.schoolClassId && !isValidObjectId(val.schoolClassId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid schoolClassId", path: ["schoolClassId"] });
    }
    if (val.schoolStreamId && !isValidObjectId(val.schoolStreamId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid schoolStreamId", path: ["schoolStreamId"] });
    }
  });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);
  const student = await prisma.student.findFirst({
    where: { id, ...orgWhere },
    include: {
      organization: { select: { slug: true, name: true, institutionTier: true } },
      schoolClass: { select: { id: true, code: true, name: true } },
      schoolStream: { select: { id: true, code: true, name: true } },
    },
  });
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const payments = await prisma.payment.findMany({
    where: { studentId: id, ...orgWhere },
    orderBy: { createdAt: "desc" },
  });

  const programme = await prisma.programme.findUnique({
    where: { organizationId_code: { organizationId: student.organizationId, code: student.programmeCode } },
    include: { fees: true },
  });
  const progress = programme
    ? buildStudentProgrammeProgress(
        programme,
        payments.filter((p) => p.programmeCode === student.programmeCode),
      )
    : null;
  const programmeDuration = programme ? getProgrammeDurationSummary(programme) : null;

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      telegramId: student.telegramId,
      programmeCode: student.programmeCode,
      programmeName: programme?.name ?? null,
      programmeDuration,
      schoolClassId: student.schoolClassId,
      schoolStreamId: student.schoolStreamId,
      schoolClassCode: student.schoolClass?.code ?? null,
      schoolClassName: student.schoolClass?.name ?? null,
      schoolStreamCode: student.schoolStream?.code ?? null,
      schoolStreamName: student.schoolStream?.name ?? null,
      year: student.year,
      semester: student.semester,
      createdAt: student.createdAt,
      organizationSlug: student.organization.slug,
      organizationName: student.organization.name,
      progress,
    },
    payments: payments.map((p) => ({
      id: p.id,
      status: p.status,
      totalUgx: p.totalUgx,
      tonAmount: p.tonAmount,
      txHash: p.txHash,
      rail: p.rail,
      year: p.year,
      semester: p.semester,
      programmeCode: p.programmeCode,
      createdAt: p.createdAt,
      confirmedAt: p.confirmedAt,
    })),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);
  const student = await prisma.student.findFirst({
    where: { id, ...orgWhere },
    select: { id: true, organizationId: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = parsed.data;
  const update: {
    name?: string;
    email?: string;
    phone?: string;
    programmeCode?: string;
    schoolClassId?: string | null;
    schoolStreamId?: string | null;
    year?: number;
    semester?: number;
  } = {};

  if (data.name !== undefined) update.name = data.name;
  if (data.email !== undefined) update.email = data.email;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.year !== undefined) update.year = data.year;
  if (data.semester !== undefined) update.semester = data.semester;

  if (data.schoolClassId?.trim() && data.schoolStreamId?.trim()) {
    const enrollment = await resolveStudentEnrollmentFromClassStream({
      organizationId: student.organizationId,
      schoolClassId: data.schoolClassId.trim(),
      schoolStreamId: data.schoolStreamId.trim(),
    });
    update.programmeCode = enrollment.programmeCode;
    update.schoolClassId = enrollment.schoolClassId;
    update.schoolStreamId = enrollment.schoolStreamId;
  } else if (data.programmeCode?.trim()) {
    update.programmeCode = data.programmeCode.trim().toUpperCase();
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: update,
    select: {
      id: true,
      name: true,
      programmeCode: true,
      schoolClassId: true,
      schoolStreamId: true,
      year: true,
      semester: true,
    },
  });

  return NextResponse.json({ student: updated });
}
