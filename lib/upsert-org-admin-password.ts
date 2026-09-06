import "server-only";

import bcrypt from "bcryptjs";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Create or update an org_admin password for a tenant (Master console).
 * Defaults email to the organization's registration contact when omitted.
 */
export async function upsertOrgAdminPassword(
  organizationId: string,
  opts: { password: string; email?: string; name?: string },
): Promise<{
  adminId: string;
  adminEmail: string;
  created: boolean;
  updated: boolean;
}> {
  const password = opts.password.trim();
  if (password.length < 10) {
    throw new Error("Password must be at least 10 characters");
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
  if (!org) {
    throw new Error("Organization not found");
  }
  if (org.slug === "default") {
    throw new Error("Cannot assign org admin password on the template organization");
  }

  const email = (opts.email?.trim() || org.registrationContactEmail || "").toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Provide an admin email, or set a registration contact email on the organization first");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const name = (opts.name?.trim() || org.name).slice(0, 120);

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === AdminRole.master) {
      throw new Error("That email belongs to a platform master account");
    }
    if (existing.organizationId && existing.organizationId !== org.id) {
      throw new Error("That email is already an admin for a different organization");
    }
    const updated = await prisma.adminUser.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        organizationId: org.id,
        role: AdminRole.org_admin,
        ...(opts.name?.trim() ? { name } : {}),
      },
      select: { id: true, email: true },
    });
    return { adminId: updated.id, adminEmail: updated.email, created: false, updated: true };
  }

  const created = await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      name,
      role: AdminRole.org_admin,
      organizationId: org.id,
    },
    select: { id: true, email: true },
  });
  return { adminId: created.id, adminEmail: created.email, created: true, updated: false };
}
