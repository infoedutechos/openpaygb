import { getAdminFromCookies } from "@/lib/auth";
import { resolveSchoolAdminOrganization } from "@/lib/admin-school-org";
import { loadSchoolOrgContext } from "@/lib/school-org-context";

export async function requireSchoolAdminScope(organizationSlug?: string | null) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  const scope = await resolveSchoolAdminOrganization(admin, organizationSlug ?? null);
  if (!scope.ok) {
    return { ok: false as const, status: scope.status, error: scope.error };
  }
  const context = await loadSchoolOrgContext(scope.organizationId);
  if (!context) {
    return { ok: false as const, status: 404, error: "Organization not found" };
  }
  return { ok: true as const, admin, scope, context };
}
