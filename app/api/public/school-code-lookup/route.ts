import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findActiveOrganizationBySchoolPayCode } from "@/lib/school-pay-code";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({
  schoolCode: z.string().min(4).max(12),
  /** Optional: student admission / registration number to confirm before paying. */
  admissionNo: z.string().max(64).optional(),
});

/**
 * POST /api/public/school-code-lookup
 * SchoolPay-style flow: payer enters the School Code (+ optionally the student's
 * admission/registration number) and gets the school checkout entry — mirroring
 * "enter School Code, then student registration number" on MoMo/agent rails.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`school-code-lookup:${ip}`, 30, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many lookups — try again later" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const org = await findActiveOrganizationBySchoolPayCode(parsed.data.schoolCode);
    if (!org) {
      return NextResponse.json(
        { error: "No active school found for that School Code — check with the school bursar" },
        { status: 404 },
      );
    }

    const admissionNo = parsed.data.admissionNo?.trim() ?? "";
    let student: { name: string; admissionNo: string } | null = null;
    if (admissionNo) {
      const row = await prisma.student.findFirst({
        where: { organizationId: org.organizationId, admissionNo },
        select: { name: true, admissionNo: true },
      });
      // Name confirmation mirrors SchoolPay so the payer can verify before sending money.
      if (row) student = { name: row.name, admissionNo: row.admissionNo };
    }

    return NextResponse.json({
      organizationSlug: org.organizationSlug,
      organizationName: org.organizationName,
      payUrl: `/pay/${encodeURIComponent(org.organizationSlug)}`,
      student,
      ...(admissionNo && !student
        ? { studentNotFound: true }
        : {}),
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "POST /api/public/school-code-lookup",
      fallback: "Lookup failed",
    });
  }
}
