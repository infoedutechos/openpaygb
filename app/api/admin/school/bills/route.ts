import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { schoolSessionWhere } from "@/lib/school-session-scope";
import { excludeNonTuitionCardHoldersWhere } from "@/lib/admin-openpay-holder";
import { isValidObjectId } from "@/lib/object-id";
import {
  isSchoolBillingRound,
  schoolBillingRoundLabel,
  termsForBillingRound,
  type SchoolBillingRound,
} from "@/lib/school-billing-rounds";
import { ensureDefaultSchoolTerms } from "@/lib/school-terms";

const BulkBillBody = z.object({
  organizationSlug: z.string().optional().nullable(),
  term: z.coerce.number().int().min(1).max(99),
  schoolAccountId: z.string().min(1),
  amountUgx: z.coerce.number().int().min(0),
  classId: z.string().optional().nullable(),
  studentIds: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  billingRound: z.enum(["once", "per_term", "per_session"]).optional().default("once"),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId")?.trim() || null;
    const term = normalizeSchoolTerm(url.searchParams.get("term") ?? 1);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (studentId && !isValidObjectId(studentId)) {
      return NextResponse.json({ error: "Invalid studentId" }, { status: 400 });
    }

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
        studentName: c.student?.name ?? "—",
        schoolAccountId: c.schoolAccountId,
        accountName: c.schoolAccount?.name ?? "—",
        amountUgx: c.amountUgx,
        term: c.term,
        notes: c.notes,
        billingRound: (c as { billingRound?: string }).billingRound ?? "once",
        billingRoundLabel: schoolBillingRoundLabel((c as { billingRound?: string }).billingRound),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/bills" });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BulkBillBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (!isValidObjectId(body.schoolAccountId)) {
      return NextResponse.json({ error: "Invalid schoolAccountId" }, { status: 400 });
    }
    if (body.classId && !isValidObjectId(body.classId)) {
      return NextResponse.json({ error: "Invalid classId" }, { status: 400 });
    }

    const billingRound: SchoolBillingRound = isSchoolBillingRound(body.billingRound)
      ? body.billingRound
      : "once";
    const primaryTerm = normalizeSchoolTerm(body.term);

    await ensureDefaultSchoolTerms(auth.scope.organizationId);
    const termRows = await prisma.schoolTerm.findMany({
      where: { organizationId: auth.scope.organizationId },
      select: { termNumber: true },
      orderBy: { termNumber: "asc" },
    });
    const targetTerms = termsForBillingRound(
      billingRound,
      primaryTerm,
      termRows.map((t) => t.termNumber),
    );

    const account = await prisma.schoolAccount.findFirst({
      where: {
        id: body.schoolAccountId,
        organizationId: auth.scope.organizationId,
        kind: "income",
      },
      select: { id: true },
    });
    if (!account) return NextResponse.json({ error: "Income account not found" }, { status: 404 });

    let studentIds = (body.studentIds ?? []).filter((id) => isValidObjectId(id));
    if (body.classId && studentIds.length === 0) {
      const students = await prisma.student.findMany({
        where: {
          organizationId: auth.scope.organizationId,
          schoolClassId: body.classId,
          ...schoolSessionWhere(auth.context.sessionId),
          ...excludeNonTuitionCardHoldersWhere(),
        },
        select: { id: true },
      });
      studentIds = students.map((s) => s.id);
    }
    if (studentIds.length === 0) {
      return NextResponse.json({ error: "No students selected" }, { status: 400 });
    }

    const rawSession = auth.context.sessionId;
    const sessionId =
      rawSession && isValidObjectId(rawSession)
        ? (
            await prisma.schoolSession.findFirst({
              where: { id: rawSession, organizationId: auth.scope.organizationId },
              select: { id: true },
            })
          )?.id ?? null
        : null;

    const baseNotes = body.notes?.trim() ?? "";
    const roundTag = schoolBillingRoundLabel(billingRound);
    const notes = baseNotes || `Set rounds: ${roundTag}`;

    let chargeCount = 0;
    let skipped = 0;
    for (const studentId of studentIds) {
      for (const term of targetTerms) {
        const existing = await prisma.studentBillCharge.findFirst({
          where: {
            organizationId: auth.scope.organizationId,
            studentId,
            schoolAccountId: body.schoolAccountId,
            term,
          },
          select: { id: true },
        });
        if (existing) {
          // Avoid duplicating the same fee head for this student in the same term.
          skipped++;
          continue;
        }
        await prisma.studentBillCharge.create({
          data: {
            organizationId: auth.scope.organizationId,
            studentId,
            schoolAccountId: body.schoolAccountId,
            sessionId,
            term,
            amountUgx: body.amountUgx,
            notes,
            billingRound,
          },
        });
        chargeCount++;
      }
    }

    return NextResponse.json({
      created: chargeCount,
      skipped,
      charges: chargeCount,
      terms: targetTerms,
      billingRound,
      message:
        skipped > 0 && chargeCount === 0
          ? "Already billed for this fee head in the selected term(s)."
          : skipped > 0
            ? `Assigned ${chargeCount}; skipped ${skipped} already billed.`
            : undefined,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/bills" });
  }
}
