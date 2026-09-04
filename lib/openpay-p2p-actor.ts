import "server-only";

import { getStudentFromCookies } from "@/lib/student-auth";
import { requireAdminOpenPayHolder } from "@/lib/admin-openpay-api";
import { requireStaffOpenPayHolder } from "@/lib/staff-openpay-api";
import { requireDeveloperOpenPayHolder } from "@/lib/developer-openpay-api";

export type OpenPayP2pActor = {
  studentId: string;
  organizationId: string;
  kind: "student" | "admin" | "staff" | "developer";
  name?: string;
  email?: string;
};

/**
 * Resolve any signed-in OpenPayGB card holder for Dex P2P (student, admin, staff, or developer app).
 * Shadow Student rows already back non-tuition holders.
 */
export async function resolveOpenPayP2pActor(req?: Request): Promise<
  | { ok: true; actor: OpenPayP2pActor }
  | { ok: false; status: 401; error: string }
> {
  const student = await getStudentFromCookies();
  if (student?.sub && student.organizationId) {
    return {
      ok: true,
      actor: {
        studentId: student.sub,
        organizationId: student.organizationId,
        kind: "student",
      },
    };
  }

  const admin = await requireAdminOpenPayHolder(req);
  if (admin.ok) {
    return {
      ok: true,
      actor: {
        studentId: admin.holder.studentId,
        organizationId: admin.holder.organizationId,
        kind: "admin",
        name: admin.holder.name,
        email: admin.holder.email,
      },
    };
  }

  const staff = await requireStaffOpenPayHolder();
  if (staff.ok) {
    return {
      ok: true,
      actor: {
        studentId: staff.holder.studentId,
        organizationId: staff.holder.organizationId,
        kind: "staff",
        name: staff.holder.name,
        email: staff.holder.email,
      },
    };
  }

  const developer = await requireDeveloperOpenPayHolder();
  if (developer.ok) {
    return {
      ok: true,
      actor: {
        studentId: developer.holder.studentId,
        organizationId: developer.holder.organizationId,
        kind: "developer",
        name: developer.holder.name,
        email: developer.holder.email,
      },
    };
  }

  return {
    ok: false,
    status: 401,
    error:
      "Sign in with an OpenPayGB account (student, admin, staff, or developer app) that has a card holder to use P2P.",
  };
}
