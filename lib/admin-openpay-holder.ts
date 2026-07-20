import "server-only";

import { prisma } from "@/lib/prisma";
import { getDefaultOrganizationId } from "@/lib/default-organization";

/** Programme code for admin personal OpenPayGB card holders (excluded from tuition rolls). */
export const ADMIN_CARD_PROGRAMME = "ADMIN_CARD";

export function isNonTuitionCardProgramme(code: string | null | undefined): boolean {
  const c = (code ?? "").trim().toUpperCase();
  return c === ADMIN_CARD_PROGRAMME || c === "STAFF_CARD" || c === "GUEST";
}

/**
 * Resolve which organization an admin's personal card belongs to.
 * Org admins are locked to their workspace; masters may use orgSlug or platform default.
 */
export async function resolveAdminCardOrganizationId(opts: {
  role: string;
  organizationId: string | null | undefined;
  organizationSlug?: string | null;
}): Promise<string> {
  if (opts.role === "org_admin") {
    if (!opts.organizationId) {
      throw new Error("Link your account to a school or institution workspace to get an OpenPayGB card.");
    }
    return opts.organizationId;
  }

  const slug = opts.organizationSlug?.trim().toLowerCase();
  if (slug) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!org) throw new Error(`Unknown organization slug "${slug}".`);
    return org.id;
  }

  if (opts.organizationId) return opts.organizationId;
  return getDefaultOrganizationId();
}

/**
 * Resolve or create the shadow Student row that holds an admin's OpenPayGB card.
 * Never mutates a tuition student's programme — creates a dedicated ADMIN_CARD row.
 */
export async function ensureAdminOpenPayHolder(
  adminUserId: string,
  opts?: { organizationSlug?: string | null },
): Promise<{
  studentId: string;
  organizationId: string;
  name: string;
  email: string;
}> {
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      openPayStudentId: true,
    },
  });
  if (!admin) throw new Error("Admin not found");

  const organizationId = await resolveAdminCardOrganizationId({
    role: admin.role,
    organizationId: admin.organizationId,
    organizationSlug: opts?.organizationSlug,
  });

  const email = admin.email.trim().toLowerCase();
  const displayName = admin.name?.trim() || email.split("@")[0] || "Admin";

  if (admin.openPayStudentId) {
    const linked = await prisma.student.findUnique({
      where: { id: admin.openPayStudentId },
      select: { id: true, organizationId: true, name: true, email: true, programmeCode: true },
    });
    if (
      linked &&
      linked.organizationId === organizationId &&
      linked.programmeCode.toUpperCase() === ADMIN_CARD_PROGRAMME
    ) {
      return {
        studentId: linked.id,
        organizationId: linked.organizationId,
        name: linked.name || displayName,
        email: linked.email || email,
      };
    }
  }

  let student = await prisma.student.findFirst({
    where: {
      organizationId,
      programmeCode: ADMIN_CARD_PROGRAMME,
      email: { equals: email, mode: "insensitive" },
    },
    select: { id: true, organizationId: true, name: true, email: true },
  });

  if (!student) {
    student = await prisma.student.create({
      data: {
        organizationId,
        name: displayName,
        email,
        programmeCode: ADMIN_CARD_PROGRAMME,
        admissionNo: `ADMIN-${admin.id.slice(-8).toUpperCase()}`,
        year: 1,
        semester: 1,
      },
      select: { id: true, organizationId: true, name: true, email: true },
    });
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { openPayStudentId: student.id },
  });

  return {
    studentId: student.id,
    organizationId: student.organizationId,
    name: student.name || displayName,
    email: student.email || email,
  };
}

/** Prisma where fragment: exclude guest/admin card holders from tuition student lists. */
export function excludeNonTuitionCardHoldersWhere() {
  return {
    programmeCode: { notIn: [ADMIN_CARD_PROGRAMME, "STAFF_CARD", "GUEST"] },
  };
}

/** Read optional org slug from a request URL (masters: `orgSlug` or `organizationSlug`). */
export function organizationSlugFromRequest(req: Request): string | null {
  try {
    const sp = new URL(req.url).searchParams;
    return (
      sp.get("organizationSlug")?.trim().toLowerCase() ||
      sp.get("orgSlug")?.trim().toLowerCase() ||
      null
    );
  } catch {
    return null;
  }
}
