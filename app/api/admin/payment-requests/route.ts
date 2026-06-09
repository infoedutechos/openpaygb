import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromCookies } from "@/lib/auth";
import { adminCanAccessStudentOrganization, organizationWhereForSession } from "@/lib/admin-org-scope";
import { prisma } from "@/lib/prisma";
import { getActiveOrganizationBySlug } from "@/lib/organizations";
import {
  createPaymentRequest,
  paymentRequestPayUrl,
} from "@/lib/payment-request";
import { apiErrorResponse } from "@/lib/api-error";

const CreateBody = z.object({
  organizationSlug: z.string().min(2).optional(),
  studentId: z.string().optional(),
  amountUgx: z.number().int().positive(),
  memo: z.string().max(500).optional(),
  programmeCode: z.string().min(2).optional(),
  year: z.number().int().min(1).max(6).optional(),
  semester: z.number().int().min(1).max(3).optional(),
  feeSelectionMode: z.enum(["semester", "year", "programme", "custom"]).optional(),
});

export async function GET() {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const scope = await organizationWhereForSession(admin.sub, admin.role);
    const rows = await prisma.paymentRequest.findMany({
      where: { ...scope, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { organization: { select: { slug: true, name: true } } },
    });

    return NextResponse.json({
      requests: rows.map((r: (typeof rows)[number]) => ({
        id: r.id,
        organizationSlug: r.organization.slug,
        organizationName: r.organization.name,
        studentId: r.studentId,
        amountUgx: r.amountUgx,
        memo: r.memo,
        programmeCode: r.programmeCode,
        year: r.year,
        semester: r.semester,
        feeSelectionMode: r.feeSelectionMode,
        status: r.status,
        expiresAt: r.expiresAt.toISOString(),
        payUrl: paymentRequestPayUrl(r.organization.slug, r.id, r.studentId),
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/payment-requests" });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    let organizationId: string;
    let organizationSlug: string;

    if (admin.role === "master" && parsed.data.organizationSlug) {
      const org = await getActiveOrganizationBySlug(parsed.data.organizationSlug.trim().toLowerCase());
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      organizationId = org.id;
      organizationSlug = org.slug;
    } else {
      const scope = await organizationWhereForSession(admin.sub, admin.role);
      if (!("organizationId" in scope)) {
        return NextResponse.json({ error: "organizationSlug required for master" }, { status: 400 });
      }
      organizationId = scope.organizationId;
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { slug: true },
      });
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      organizationSlug = org.slug;
    }

    if (parsed.data.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: parsed.data.studentId },
        select: { organizationId: true },
      });
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      const ok = await adminCanAccessStudentOrganization(admin.sub, admin.role, student.organizationId);
      if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      organizationId = student.organizationId;
    }

    const row = await createPaymentRequest({
      organizationId,
      createdByAdminId: admin.sub,
      studentId: parsed.data.studentId,
      amountUgx: parsed.data.amountUgx,
      memo: parsed.data.memo,
      programmeCode: parsed.data.programmeCode,
      year: parsed.data.year,
      semester: parsed.data.semester,
      feeSelectionMode: parsed.data.feeSelectionMode,
    });

    return NextResponse.json(
      {
        request: {
          id: row.id,
          amountUgx: row.amountUgx,
          memo: row.memo,
          payUrl: paymentRequestPayUrl(organizationSlug, row.id, row.studentId),
          expiresAt: row.expiresAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/payment-requests" });
  }
}
