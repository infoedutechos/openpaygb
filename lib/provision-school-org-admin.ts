import "server-only";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";
import { sendOrgAdminInviteEmail } from "@/lib/org-admin-invite-email";
import { absoluteUrl } from "@/lib/public-url";
import { isSchoolWorkspaceAutoAdminLoginEnabled } from "@/lib/school-workspace-registration-policy";

function randomPassword(): string {
  return randomBytes(18).toString("base64url").slice(0, 24);
}

/**
 * When Master policy allows, create org_admin for registration contact and email password-set link.
 * Pass `password` when the registrant chose a password on the register form (skips invite email).
 */
export async function maybeProvisionSchoolOrgAdmin(
  organizationId: string,
  opts?: { password?: string },
): Promise<{
  created: boolean;
  emailSent: boolean;
  adminEmail: string | null;
}> {
  const passwordChosen = Boolean(opts?.password?.trim());
  const enabled = passwordChosen || (await isSchoolWorkspaceAutoAdminLoginEnabled());
  if (!enabled) {
    return { created: false, emailSent: false, adminEmail: null };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      tenantStatus: true,
      registrationContactEmail: true,
    },
  });
  // Allow creating the admin while the workspace is still pending when the registrant set a password.
  if (!org || (org.tenantStatus !== "active" && !passwordChosen)) {
    return { created: false, emailSent: false, adminEmail: null };
  }

  const email = org.registrationContactEmail?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { created: false, emailSent: false, adminEmail: null };
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return { created: false, emailSent: false, adminEmail: email };
  }

  const plainPassword = opts?.password?.trim() || randomPassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const admin = await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      name: org.name.trim().slice(0, 120),
      role: AdminRole.org_admin,
      organizationId: org.id,
    },
  });

  if (passwordChosen) {
    return { created: true, emailSent: false, adminEmail: email };
  }

  await prisma.adminPasswordResetToken.deleteMany({ where: { adminUserId: admin.id } });
  const plainToken = newAdminResetTokenPlain();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  await prisma.adminPasswordResetToken.create({
    data: {
      adminUserId: admin.id,
      tokenHash: hashAdminResetToken(plainToken),
      expiresAt,
    },
  });

  const resetUrl = absoluteUrl(`/admin/reset-password?token=${encodeURIComponent(plainToken)}`);
  const emailSent = await sendOrgAdminInviteEmail({
    adminEmail: email,
    schoolName: org.name,
    schoolSlug: org.slug,
    resetUrl,
  });

  return { created: true, emailSent, adminEmail: email };
}
