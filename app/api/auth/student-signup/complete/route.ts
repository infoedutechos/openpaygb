import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { getStudentSignupSessionFromCookies, studentSignupCookieName } from "@/lib/student-signup-auth";
import { signStudentToken, studentCookieName } from "@/lib/student-auth";

const Body = z.object({
  organizationSlug: z.string().min(2).max(64),
  programmeCode: z.string().min(2).optional(),
  year: z.number().int().min(1).max(6).optional(),
  semester: z.number().int().min(1).max(3).optional(),
});

export async function POST(req: Request) {
  try {
    const sess = await getStudentSignupSessionFromCookies();
    if (!sess) {
      return NextResponse.json({ error: "Session expired — open your confirmation link again" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const slug = parsed.data.organizationSlug.trim().toLowerCase();
    const org = await getActiveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const tokenRow = await prisma.studentSignupToken.findUnique({
      where: { id: sess.tid },
    });

    if (!tokenRow || tokenRow.consumedAt || tokenRow.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Signup session invalid or expired" }, { status: 401 });
    }
    if (!tokenRow.verifiedAt) {
      return NextResponse.json({ error: "Email not verified yet" }, { status: 403 });
    }

    const emailLower = tokenRow.email.toLowerCase();
    const existing = await prisma.student.findFirst({
      where: { organizationId: org.id, email: emailLower },
    });
    if (existing?.portalPasswordHash) {
      return NextResponse.json(
        { error: "An account with this email already exists at this school. Sign in at /student/login." },
        { status: 409 },
      );
    }

    if (tokenRow.googleSub) {
      const dupGoogle = await prisma.student.findFirst({
        where: { organizationId: org.id, googleSub: tokenRow.googleSub },
      });
      if (dupGoogle) {
        return NextResponse.json(
          { error: "This Google account is already linked at this school. Sign in with Google or email." },
          { status: 409 }
        );
      }
    }

    const programmeCode = parsed.data.programmeCode?.trim().toUpperCase();
    const year = parsed.data.year ?? 1;
    const semester = parsed.data.semester ?? 1;

    let programme;
    if (programmeCode) {
      programme = await prisma.programme.findUnique({
        where: { organizationId_code: { organizationId: org.id, code: programmeCode } },
      });
      if (!programme) {
        return NextResponse.json({ error: "Programme not found at this school" }, { status: 400 });
      }
    } else {
      programme = await prisma.programme.findFirst({
        where: { organizationId: org.id },
        orderBy: { code: "asc" },
      });
      if (!programme) {
        return NextResponse.json(
          { error: "This school has no programmes configured yet. Try another school or contact the school." },
          { status: 400 },
        );
      }
    }

    const studentData = {
      name: tokenRow.name.trim(),
      portalPasswordHash: tokenRow.passwordHash,
      programmeCode: programme.code,
      year,
      semester,
      ...(tokenRow.googleSub ? { googleSub: tokenRow.googleSub } : {}),
    };

    const [student] = await prisma.$transaction([
      existing
        ? prisma.student.update({
            where: { id: existing.id },
            data: studentData,
          })
        : prisma.student.create({
            data: {
              organizationId: org.id,
              email: emailLower,
              googleSub: tokenRow.googleSub ?? "",
              ...studentData,
            },
          }),
      prisma.studentSignupToken.update({
        where: { id: tokenRow.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    const sessionJwt = await signStudentToken({ sub: student.id, organizationId: student.organizationId });
    const res = NextResponse.json({
      ok: true,
      student: {
        id: student.id,
        organizationSlug: org.slug,
      },
    });
    res.cookies.set(studentSignupCookieName(), "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    res.cookies.set(studentCookieName(), sessionJwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error("[student-signup/complete]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
