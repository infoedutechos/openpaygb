import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { signStudentToken, studentCookieName } from "@/lib/student-auth";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { recordStudentLogin } from "@/lib/record-login";

const Body = z.object({
  organizationSlug: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`auth-student-login:${ip}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
    }

    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const slug = parsed.data.organizationSlug.trim().toLowerCase();
    const org = await getActiveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const emailLower = parsed.data.email.toLowerCase();
    const matches = await prisma.student.findMany({
      where: { organizationId: org.id, email: emailLower },
      select: {
        id: true,
        organizationId: true,
        name: true,
        programmeCode: true,
        year: true,
        semester: true,
        portalPasswordHash: true,
        googleSub: true,
      },
      take: 5,
    });

    if (matches.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (matches.length > 1) {
      return NextResponse.json(
        { error: "Multiple accounts share this email. Contact your school." },
        { status: 409 }
      );
    }

    const student = matches[0];
    if (!student.portalPasswordHash) {
      const googleSignInAvailable = Boolean(student.googleSub?.trim());
      const error = googleSignInAvailable
        ? "This account uses Google sign-in. Use Continue with Google below, or ask your school admin to set an email password."
        : "No portal password on file for this email. If you only paid tuition as a guest, register for the student portal or ask your school admin to set a portal password (Admin → Students).";
      return NextResponse.json(
        {
          error,
          code: "PORTAL_PASSWORD_NOT_SET",
          googleSignInAvailable,
        },
        { status: 403 },
      );
    }

    const ok = await bcrypt.compare(parsed.data.password, student.portalPasswordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await recordStudentLogin(student.id);

    const token = await signStudentToken({ sub: student.id, organizationId: student.organizationId });
    const res = NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        programmeCode: student.programmeCode,
        year: student.year,
        semester: student.semester,
        organizationSlug: org.slug,
        organizationName: org.name,
      },
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
    console.error("[student-login]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
