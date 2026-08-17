/**
 * Canonical product access surfaces.
 *
 * - **User-facing:** students, staff, school/institution admins — each cookie/JWT-scoped.
 * - **Developer-facing:** Partner API / app registry at `/developers`.
 * - **Operators (developers + platform masters)** may *navigate* all sides; each side still
 *   requires its own sign-in cookie (no cross-cookie impersonation).
 */

export type AccessSurfaceKind = "user" | "developer" | "operator";

export type OperatorSideLink = {
  label: string;
  href: string;
  kind: "user" | "developer" | "public" | "master";
  description?: string;
};

/** Paths that belong to end-user product journeys (strict role cookies). */
export const USER_FACING_PATH_PREFIXES = [
  "/login",
  "/student",
  "/my",
  "/staff",
  "/admin",
  "/school",
  "/school-admin",
  "/pay",
  "/receipt",
  "/OdelPayUniversities",
  "/OdelPaySchools",
  "/AssessmentVerseOS",
  "/opgb",
  "/dex",
] as const;

/** Paths that belong to the builder / Partner API surface. */
export const DEVELOPER_FACING_PATH_PREFIXES = ["/developers", "/docs"] as const;

/**
 * Links so developers (and masters) can open every product side.
 * Auth remains per-audience when they enter a gated portal.
 */
export const OPERATOR_ALL_SIDES_LINKS: OperatorSideLink[] = [
  {
    label: "Login chooser (all users)",
    href: "/login",
    kind: "user",
    description: "Student · Staff · Admin cards",
  },
  {
    label: "Student portal",
    href: "/student/login",
    kind: "user",
    description: "Admission / email login",
  },
  {
    label: "Staff portal",
    href: "/staff/login",
    kind: "user",
    description: "Staff ID login",
  },
  {
    label: "School / institution admin",
    href: "/admin/login",
    kind: "user",
    description: "Tuition hub (org_admin)",
  },
  {
    label: "Pay tuition / fees",
    href: "/pay",
    kind: "public",
    description: "Guest checkout",
  },
  {
    label: "Schools lobby",
    href: "/OdelPaySchools",
    kind: "public",
  },
  {
    label: "Universities lobby",
    href: "/OdelPayUniversities",
    kind: "public",
  },
  {
    label: "AssessmentVerse OS",
    href: "/AssessmentVerseOS",
    kind: "public",
    description: "Assessment platform lobby",
  },
  {
    label: "OpenPayGB / Dex",
    href: "/opgb",
    kind: "public",
  },
  {
    label: "Developer hub",
    href: "/developers",
    kind: "developer",
    description: "Partner API & app registry",
  },
  {
    label: "Master console",
    href: "/admin/login?master=1",
    kind: "master",
    description: "Platform operators only",
  },
];

/** Allowed prefixes when hosting the Developers standalone app (faces all sides). */
export const ODELHUB_DEVS_ALLOWED_PATH_PREFIXES = [
  "/developers",
  "/docs",
  "/help",
  "/tma",
  "/login",
  "/admin",
  "/school",
  "/school-admin",
  "/student",
  "/staff",
  "/my",
  "/pay",
  "/receipt",
  "/OdelPayUniversities",
  "/OdelPaySchools",
  "/opgb",
  "/dex",
  "/api/docs",
] as const;

/** School / university host journeys need user portals + login chooser. */
export const ODELPAY_TENANT_EXTRA_PATH_PREFIXES = [
  "/login",
  "/student",
  "/staff",
  "/my",
] as const;

export function isUserFacingPath(pathname: string): boolean {
  return USER_FACING_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isDeveloperFacingPath(pathname: string): boolean {
  return DEVELOPER_FACING_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
