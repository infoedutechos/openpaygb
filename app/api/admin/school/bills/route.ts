import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { schoolSessionWhere } from "@/lib/school-session-scope";

const BulkBillBody = z.object({
  organizationSlug: z.string().optional(),
  term: z.number().int().min(1).max(3),
  schoolAccountId: z.string().min(1),
  amountUgx: z.number().int().min(0),
  classId: z.string().optional(),
  studentIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId");
    const term = normalizeSchoolTerm(url.searchParams.get("term") ?? 1);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const charges = await prisma.studentBillCharge.findMany({
      where: {
        organizationId: auth.scope.organizationId,
        term,
        ...(studentId ? { studentId } : {}),
      },
      include: {
        student: { select: { name: true, programmeCode: true } },
        schoolAccount: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({
      charges: charges.map((c) => ({
        id: c.id,
        studentId: c.studentId,
        studentName: c.student.name,
        accountName: c.schoolAccount.name,
        amountUgx: c.amountUgx,
        term: c.term,
        notes: c.notes,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/bills" });
  }
}

export async function POST(req: Request) {
  try {
    const body = BulkBillBody.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const term = normalizeSchoolTerm(body.term);
    const account = await prisma.schoolAccount.findFirst({
      where: { id: body.schoolAccountId, organizationId: auth.scope.organizationId, kind: "income" },
    });
    if (!account) return NextResponse.json({ error: "Income account not found" }, { status: 404 });

    let studentIds = body.studentIds ?? [];
    if (body.classId && studentIds.length === 0) {
      const students = await prisma.student.findMany({
        where: {
          organizationId: auth.scope.organizationId,
          schoolClassId: body.classId,
          ...schoolSessionWhere(auth.context.sessionId),
        },
        select: { id: true },
      });
      studentIds = students.map((s) => s.id);
    }
    if (studentIds.length === 0) {
      return NextResponse.json({ error: "No students selected" }, { status: 400 });
    }

    const sessionId = auth.context.sessionId;
    for (const studentId of studentIds) {
      const existing = await prisma.studentBillCharge.findFirst({
        where: {
          organizationId: auth.scope.organizationId,
          studentId,
          schoolAccountId: body.schoolAccountId,
          term,
        },
      });
      if (existing) {
        await prisma.studentBillCharge.update({
          where: { id: existing.id },
          data: { amountUgx: body.amountUgx, notes: body.notes?.trim() ?? "" },
        });
      } else {
        await prisma.studentBillCharge.create({
          data: {
            organizationId: auth.scope.organizationId,
            studentId,
            schoolAccountId: body.schoolAccountId,
            sessionId,
            term,
            amountUgx: body.amountUgx,
            notes: body.notes?.trim() ?? "",
          },
        });
      }
    }

    return NextResponse.json({ created: studentIds.length });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/bills" });
  }
}
