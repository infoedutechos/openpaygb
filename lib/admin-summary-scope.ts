import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { withPrismaRetry } from "@/lib/prisma-retry";

export type SummaryScope =
  | { ok: true; payScoped: Record<string, unknown>; studentScoped: Record<string, unknown>; viewerOrg: { name: string; slug: string } | null }
  | { ok: false; status: number; error: string };

/** Master may pass `organizationSlug` to scope dashboard metrics to one tenant. */
export async function resolveSummaryScope(
  adminId: string,
  role: AdminRole,
  organizationSlug: string | null,
): Promise<SummaryScope> {
  const basePay = await organizationWhereForSession(adminId, role);
  const baseStudent = { ...basePay };

  if (role !== "master" || !organizationSlug?.trim()) {
    return { ok: true, payScoped: basePay, studentScoped: baseStudent, viewerOrg: null };
  }

  const slug = organizationSlug.trim().toLowerCase();
  const org = await withPrismaRetry(() =>
    prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, tenantStatus: true },
    }),
  );
  if (!org) {
    return { ok: false, status: 404, error: "School not found for that slug" };
  }

  return {
    ok: true,
    payScoped: { organizationId: org.id },
    studentScoped: { organizationId: org.id },
    viewerOrg: { name: org.name, slug: org.slug },
  };
}
