import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";
import { sendOrgAdminInviteEmail } from "@/lib/org-admin-invite-email";
import { absoluteUrl } from "@/lib/public-url";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp } from "@/lib/rate-limit";
import { rateLimitExceeded } from "@/lib/rate-limit-distributed";

const CreateBody = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
  name: z.string().max(120).optional().default(""),
  sendInviteEmail: z.boolean().optional().default(true),
});

/** Org admins may create additional org_admin users for their own tenant. */
export async function POST(req: Request) {
  try {
    if (await rateLimitExceeded(`admin-org-users:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getAdminFromCookies();
    if (!session || session.role !== "org_admin") {
      return NextResponse.json({ error: "Only organization admins can invite colleagues" }, { status: 403 });
    }

    const adminRow = await prisma.adminUser.findUnique({
      where: { id: session.sub },
      select: { organizationId: true, organization: { select: { id: true, name: true, slug: true, tenantStatus: true } } },
    });
    if (!adminRow?.organizationId || !adminRow.organization) {
      return NextResponse.json({ error: "Organization not linked to your account" }, { status: 400 });
    }
    if (adminRow.organization.tenantStatus !== "active") {
      return NextResponse.json({ error: "Workspace must be active" }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An admin with that email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const admin = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name: parsed.data.name.trim(),
        role: AdminRole.org_admin,
        organizationId: adminRow.organizationId,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    let emailSent = false;
    if (parsed.data.sendInviteEmail) {
      await prisma.adminPasswordResetToken.deleteMany({ where: { adminUserId: admin.id } });
      const plainToken = newAdminResetTokenPlain();
      await prisma.adminPasswordResetToken.create({
        data: {
          adminUserId: admin.id,
          tokenHash: hashAdminResetToken(plainToken),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      });
      emailSent = await sendOrgAdminInviteEmail({
        adminEmail: email,
        schoolName: adminRow.organization.name,
        schoolSlug: adminRow.organization.slug,
        resetUrl: absoluteUrl(`/admin/reset-password?token=${encodeURIComponent(plainToken)}`),
      });
    }

    return NextResponse.json({ admin, emailSent }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/org-users", fallback: "Could not create admin user" });
  }
}
