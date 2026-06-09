import type { AuthMeAdmin } from "@/lib/auth-me";
import type { UserProfileData } from "@/components/profile/UserProfilePanel";

export function adminRoleToProfileRole(role: string): UserProfileData["role"] {
  return role === "master" ? "master" : "school_admin";
}

export function profileFromAuthAdmin(
  admin: AuthMeAdmin & {
    lastLoginAt?: string | null;
    previousLoginAt?: string | null;
    createdAt?: string | null;
  },
): UserProfileData {
  return {
    role: adminRoleToProfileRole(admin.role),
    name: admin.name?.trim() || admin.email,
    email: admin.email,
    organizationName: admin.organization?.name ?? null,
    organizationSlug: admin.organization?.slug ?? null,
    lastLoginAt: admin.lastLoginAt ?? null,
    previousLoginAt: admin.previousLoginAt ?? null,
    createdAt: admin.createdAt ?? null,
    signInMethod: "Email & password",
  };
}

export type StudentMeProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  programmeCode: string;
  year: number;
  semester: number;
  organizationName: string;
  organizationSlug: string;
  portalSignInEnabled?: boolean;
  lastLoginAt?: string | null;
  previousLoginAt?: string | null;
  createdAt?: string | null;
  googleSub?: string | null;
};

export function profileFromStudentMe(student: StudentMeProfile): UserProfileData {
  const signInMethod = student.googleSub
    ? "Google"
    : student.portalSignInEnabled
      ? "Email & password"
      : "Guest checkout (no portal password yet)";
  return {
    role: "student",
    name: student.name,
    email: student.email,
    phone: student.phone ?? null,
    organizationName: student.organizationName,
    organizationSlug: student.organizationSlug,
    programmeCode: student.programmeCode,
    year: student.year,
    semester: student.semester,
    accountId: student.id,
    lastLoginAt: student.lastLoginAt ?? null,
    previousLoginAt: student.previousLoginAt ?? null,
    createdAt: student.createdAt ?? null,
    signInMethod,
  };
}
