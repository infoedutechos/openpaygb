import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { signStaffToken, staffCookieName } from "@/lib/staff-auth";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { SchoolStaffStatus } from "@prisma/client";

const Body = z.object({
  organizationSlug: z.string().min(2),
  staffCode: z.string().min(1).max(64),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    if (rateLimitHit(`auth-staff-login:${ip}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const slug = parsed.data.organizationSlug.trim().toLowerCase();
    const org = await getActiveOrganizationBySlug(slug);
    if (!org) {
      return NextResponse.json({ error: "School or institution not found" }, { status: 404 });
    }

    const staffCode = parsed.data.staffCode.trim().toUpperCase();
    const staff = await prisma.schoolStaff.findFirst({
      where: { organizationId: org.id, staffCode },
      select: {
        id: true,
        organizationId: true,
        name: true,
        staffCode: true,
        duty: true,
        status: true,
        portalPasswordHash: true,
        lastLoginAt: true,
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Invalid Staff ID or password" }, { status: 401 });
    }
    if (staff.status !== SchoolStaffStatus.active) {
      return NextResponse.json({ error: "This staff account is inactive" }, { status: 403 });
    }
    if (!staff.portalPasswordHash) {
      return NextResponse.json(
        {
          error:
            "No portal password on file for this Staff ID. Ask your school or institution admin to set a staff portal password.",
          code: "PORTAL_PASSWORD_NOT_SET",
        },
        { status: 403 },
      );
    }

    const ok = await bcrypt.compare(parsed.data.password, staff.portalPasswordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid Staff ID or password" }, { status: 401 });
    }

    const now = new Date();
    await prisma.schoolStaff.update({
      where: { id: staff.id },
      data: {
        previousLoginAt: staff.lastLoginAt,
        lastLoginAt: now,
      },
    });

    const { getPlatformAuthPolicy } = await import("@/lib/platform-customisation");
    const policy = await getPlatformAuthPolicy();
    const maxAgeSec = policy.studentSessionDays * 24 * 60 * 60;

    const token = await signStaffToken(
      { sub: staff.id, organizationId: staff.organizationId },
      maxAgeSec,
    );
    const res = NextResponse.json({
      staff: {
        id: staff.id,
        name: staff.name,
        staffCode: staff.staffCode,
        duty: staff.duty,
        organizationSlug: org.slug,
        organizationName: org.name,
      },
    });
    res.cookies.set(staffCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: maxAgeSec,
    });
    return res;
  } catch (e) {
    console.error("[staff-login]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
