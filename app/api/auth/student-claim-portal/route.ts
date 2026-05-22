import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { signStudentToken, studentCookieName } from "@/lib/student-auth";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  organizationSlug: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

/**
 * Guest payers: set a portal password on an existing student row (no password yet)
 * when they have at least one confirmed payment at that school.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`student-claim-portal:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid details" }, { status: 400 });
    }

    const slug = parsed.data.organizationSlug.trim().toLowerCase();
    const org = await getActiveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const emailLower = parsed.data.email.trim().toLowerCase();
    const student = await prisma.student.findFirst({
      where: { organizationId: org.id, email: emailLower },
      select: { id: true, organizationId: true, name: true, portalPasswordHash: true },
    });

    if (!student) {
      return NextResponse.json(
        {
          error:
            "No student record for this email at this school. Pay tuition first with the same email, or register for a new portal account.",
        },
        { status: 404 },
      );
    }

    if (student.portalPasswordHash) {
      return NextResponse.json(
        { error: "Portal password already set. Sign in at /student/login.", code: "ALREADY_HAS_PASSWORD" },
        { status: 409 },
      );
    }

    const paymentCount = await prisma.payment.count({
      where: {
        studentId: student.id,
        organizationId: org.id,
        status: { in: ["confirmed", "pending"] },
      },
    });
    if (paymentCount === 0) {
      return NextResponse.json(
        {
          error:
            "No tuition payment found for this email yet. Pay first with the same email, or ask your school admin to set a portal password.",
        },
        { status: 403 },
      );
    }

    const portalPasswordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.student.update({
      where: { id: student.id },
      data: { portalPasswordHash },
    });

    const token = await signStudentToken({ sub: student.id, organizationId: student.organizationId });
    const res = NextResponse.json({
      ok: true,
      student: { id: student.id, name: student.name, organizationSlug: org.slug },
    });
    res.cookies.set(studentCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error("[student-claim-portal]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
