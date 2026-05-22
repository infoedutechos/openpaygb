import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertActiveOrganizationSlug } from "@/lib/organizations";
import { getStudentBalanceSummary } from "@/lib/tuition-balance";
import { serializeStudentBalance } from "@/lib/tuition-balance-json";
import { assertCheckoutStudentAccess } from "@/lib/checkout-session";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Query = z.object({
  organizationSlug: z.string().min(2),
  studentId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`checkout-balance:${ip}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const url = new URL(req.url);
    const parsed = Query.safeParse({
      organizationSlug: url.searchParams.get("organizationSlug"),
      studentId: url.searchParams.get("studentId"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await assertActiveOrganizationSlug(parsed.data.organizationSlug.trim().toLowerCase());
    const student = await prisma.student.findUnique({
      where: { id: parsed.data.studentId },
      select: {
        id: true,
        organizationId: true,
        programmeCode: true,
        year: true,
        semester: true,
      },
    });
    if (!student || student.organizationId !== org.id) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const access = await assertCheckoutStudentAccess({
      req,
      studentId: student.id,
      organizationId: student.organizationId,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const summary = await getStudentBalanceSummary({
      studentId: student.id,
      organizationId: student.organizationId,
      programmeCode: student.programmeCode,
      year: student.year,
      semester: student.semester,
    });

    return NextResponse.json({
      balance: summary ? serializeStudentBalance(summary) : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load balance";
    const status = msg.includes("not active") || msg.includes("not found") ? 404 : 500;
    if (status === 500) console.error("[checkout/balance]", e);
    return NextResponse.json({ error: msg }, { status });
  }
}
