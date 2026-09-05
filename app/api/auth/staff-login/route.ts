import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveOrganizationBySlug } from "@/lib/organizations";
import { signStaffToken, staffCookieName } from "@/lib/staff-auth";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";
import { SchoolStaffStatus } from "@prisma/client";
import {
  findStaffByCodeAcrossOrgs,
  pickStaffOrgMatch,
  stringSimilarity,
} from "@/lib/staff-login-resolve";
import type { InstitutionTier } from "@prisma/client";

const Body = z.object({
  /** Slug or typed school/institution name — may be misspelled; Staff ID can override. */
  organizationSlug: z.string().max(120).optional().default(""),
  staffCode: z.string().min(1).max(64),
  password: z.string().min(8),
  /** Optional: school | university — narrows Staff ID resolution. */
  institutionTier: z.enum(["school", "university"]).optional(),
});

async function resolveOrgByFuzzyName(
  hint: string,
  tier?: InstitutionTier | null,
): Promise<{ id: string; slug: string; name: string } | null> {
  const q = hint.trim();
  if (!q) return null;
  const rows = await prisma.organization.findMany({
    where: {
      tenantStatus: "active",
      ...(tier ? { institutionTier: tier } : {}),
    },
    select: { id: true, slug: true, name: true },
    take: 200,
  });
  let best: { id: string; slug: string; name: string } | null = null;
  let bestScore = 0;
  for (const r of rows) {
    const score = Math.max(stringSimilarity(q, r.slug), stringSimilarity(q, r.name));
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

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

    const staffCode = parsed.data.staffCode.trim().toUpperCase();
    const orgHint = parsed.data.organizationSlug.trim();
    const tier = parsed.data.institutionTier ?? null;

    // 1) Staff ID–first resolution (survives misspelled school names).
    const codeMatches = await findStaffByCodeAcrossOrgs({ staffCode, institutionTier: tier });
    let staffRow = pickStaffOrgMatch(codeMatches, orgHint);

    // Unique Staff ID → always use that org, even if school field is wrong/empty.
    if (!staffRow && codeMatches.length === 1) {
      staffRow = codeMatches[0]!;
    }

    // 2) Fall back to org slug / fuzzy name, then Staff ID within that org.
    let org: { id: string; slug: string; name: string } | null = null;
    if (!staffRow) {
      const slugTry = orgHint.toLowerCase();
      org = slugTry ? await getActiveOrganizationBySlug(slugTry) : null;
      if (!org && orgHint) {
        org = await resolveOrgByFuzzyName(orgHint, tier);
      }
      if (!org) {
        return NextResponse.json(
          {
            error:
              codeMatches.length > 1
                ? "This Staff ID exists at more than one institution — pick the correct school from the list."
                : "School or institution not found. Check the name, or rely on your Staff ID alone if it is unique.",
          },
          { status: 404 },
        );
      }

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
      staffRow = {
        staffId: staff.id,
        organizationId: staff.organizationId,
        organizationSlug: org.slug,
        organizationName: org.name,
        institutionTier: tier ?? "school",
        staffCode: staff.staffCode,
        name: staff.name,
        portalPasswordHash: staff.portalPasswordHash,
        status: staff.status,
        lastLoginAt: staff.lastLoginAt,
      };
    }

    if (staffRow.status !== SchoolStaffStatus.active) {
      return NextResponse.json({ error: "This staff account is inactive" }, { status: 403 });
    }
    if (!staffRow.portalPasswordHash) {
      return NextResponse.json(
        {
          error:
            "No portal password on file for this Staff ID. Ask your school or institution admin to set a staff portal password.",
          code: "PORTAL_PASSWORD_NOT_SET",
        },
        { status: 403 },
      );
    }

    const ok = await bcrypt.compare(parsed.data.password, staffRow.portalPasswordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid Staff ID or password" }, { status: 401 });
    }

    const now = new Date();
    await prisma.schoolStaff.update({
      where: { id: staffRow.staffId },
      data: {
        previousLoginAt: staffRow.lastLoginAt,
        lastLoginAt: now,
      },
    });

    const duty = await prisma.schoolStaff.findUnique({
      where: { id: staffRow.staffId },
      select: { duty: true },
    });

    const { getPlatformAuthPolicy } = await import("@/lib/platform-customisation");
    const policy = await getPlatformAuthPolicy();
    const maxAgeSec = policy.studentSessionDays * 24 * 60 * 60;

    const token = await signStaffToken(
      { sub: staffRow.staffId, organizationId: staffRow.organizationId },
      maxAgeSec,
    );
    const res = NextResponse.json({
      staff: {
        id: staffRow.staffId,
        name: staffRow.name,
        staffCode: staffRow.staffCode,
        duty: duty?.duty ?? "",
        organizationSlug: staffRow.organizationSlug,
        organizationName: staffRow.organizationName,
        resolvedFromStaffId: true,
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
