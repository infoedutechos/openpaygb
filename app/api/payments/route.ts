import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentRail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { createPendingPayment } from "@/lib/create-payment";
import { isValidObjectId } from "@/lib/object-id";
import { requirePartnerAuth } from "@/lib/partner-auth";
import { buildStudentProgrammeProgress } from "@/lib/tuition-progress";
import { apiErrorResponse } from "@/lib/api-error";

const CreateBody = z.object({
  studentId: z.string().min(1),
  programmeCode: z.string().min(2),
  year: z.number().int().min(1).max(6),
  semester: z.number().int().min(1).max(3),
  rail: z.nativeEnum(PaymentRail),
  memo: z.string().max(200).optional().default(""),
  momoReference: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const admin = await getAdminFromCookies();
  let partnerOrgId: string | null | undefined;
  if (!admin) {
    const partnerAuth = await requirePartnerAuth(req, "payments:create");
    if (!partnerAuth.ok) return partnerAuth.response;
    partnerOrgId = partnerAuth.partner.organizationId;
  }

  const json = await req.json();
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!isValidObjectId(parsed.data.studentId)) {
    return NextResponse.json({ error: "Invalid studentId" }, { status: 400 });
  }
  const student = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (partnerOrgId && partnerOrgId !== student.organizationId) {
    return NextResponse.json({ error: "Student not in API key organization scope" }, { status: 403 });
  }

  if (admin) {
    const scope = await organizationWhereForSession(admin.sub, admin.role);
    if ("organizationId" in scope && scope.organizationId !== student.organizationId) {
      return NextResponse.json({ error: "Student is outside your organization" }, { status: 403 });
    }
  }

  try {
    const doc = await createPendingPayment({
      studentId: student.id,
      programmeCode: parsed.data.programmeCode,
      year: parsed.data.year,
      semester: parsed.data.semester,
      rail: parsed.data.rail,
      memo: parsed.data.memo || undefined,
      momoReference: parsed.data.momoReference?.trim() || undefined,
    });

    return NextResponse.json(
      {
        payment: {
          id: doc.id,
          studentId: doc.studentId,
          programmeCode: doc.programmeCode,
          year: doc.year,
          semester: doc.semester,
          tuitionUgx: doc.tuitionUgx,
          functionalFeesUgx: doc.functionalFeesUgx,
          totalUgx: doc.totalUgx,
          ugxPerTonSnapshot: doc.ugxPerTonSnapshot,
          tonAmount: doc.tonAmount,
          destinationWallet: doc.destinationWallet,
          rail: doc.rail,
          status: doc.status,
          memo: doc.memo,
          momoReference: doc.momoReference,
          createdAt: doc.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return apiErrorResponse(e, {
      route: "payments",
      fallback: "Could not create payment",
    });
  }
}

export async function GET(req: Request) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const studentId = url.searchParams.get("studentId") ?? "";
  const railParam = url.searchParams.get("rail") ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100") || 100, 500);
  const organizationSlug = url.searchParams.get("organizationSlug")?.trim().toLowerCase() ?? "";

  const railFilter =
    railParam && ["telegram", "web", "momo_bridge", "mbiyo"].includes(railParam)
      ? { rail: railParam as "telegram" | "web" | "momo_bridge" | "mbiyo" }
      : {};

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

  const rows = await prisma.payment.findMany({
    where: {
      ...orgWhere,
      ...tenantFilter,
      ...(status && ["pending", "confirmed", "failed"].includes(status)
        ? { status: status as "pending" | "confirmed" | "failed" }
        : {}),
      ...(studentId && isValidObjectId(studentId) ? { studentId } : {}),
      ...railFilter,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      student: { select: { id: true, name: true } },
      organization: { select: { slug: true, name: true } },
    },
  });

  const studentIds = [...new Set(rows.map((row) => row.studentId))];
  const studentPayments =
    studentIds.length > 0
      ? await prisma.payment.findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { createdAt: "asc" },
        })
      : [];
  const paymentsByStudent = new Map<string, typeof studentPayments>();
  for (const payment of studentPayments) {
    paymentsByStudent.set(payment.studentId, [...(paymentsByStudent.get(payment.studentId) ?? []), payment]);
  }

  const programmeKeys = [
    ...new Map(rows.map((row) => [`${row.organizationId}:${row.programmeCode}`, row])).values(),
  ];
  const programmeRows =
    programmeKeys.length > 0
      ? await prisma.programme.findMany({
          where: {
            OR: programmeKeys.map((row) => ({
              organizationId: row.organizationId,
              code: row.programmeCode,
            })),
          },
          include: { fees: true },
        })
      : [];
  const programmesByKey = new Map(programmeRows.map((programme) => [`${programme.organizationId}:${programme.code}`, programme]));

  return NextResponse.json({
    payments: rows.map((row) => {
      const programme = programmesByKey.get(`${row.organizationId}:${row.programmeCode}`);
      const progress = programme
        ? buildStudentProgrammeProgress(programme, paymentsByStudent.get(row.studentId) ?? [])
        : null;
      return {
        id: row.id,
        studentName: row.student.name,
        studentId: row.studentId,
        programmeCode: row.programmeCode,
        year: row.year,
        semester: row.semester,
        feeSelectionMode: row.feeSelectionMode,
        totalUgx: row.totalUgx,
        tonAmount: row.tonAmount,
        txHash: row.txHash,
        status: row.status,
        rail: row.rail,
        momoReference: row.momoReference,
        createdAt: row.createdAt,
        confirmedAt: row.confirmedAt,
        organizationSlug: row.organization.slug,
        organizationName: row.organization.name,
        progress,
      };
    }),
  });
}
