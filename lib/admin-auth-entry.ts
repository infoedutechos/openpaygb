/** Shared URLs and copy helpers for tuition / school admin sign-in. */

/** Public-friendly URL (rewrites to {@link SCHOOL_ADMIN_LOGIN_PATH}). */
export const PUBLIC_SCHOOL_LOGIN_PATH = "/school/login";
export const SCHOOL_ADMIN_LOGIN_PATH = "/admin/login?school=1";
export const PLATFORM_MASTER_LOGIN_PATH = "/admin/login?master=1";
export const ADMIN_LOGIN_PATH = "/admin/login";

export type AdminLoginMode = "higher" | "schools" | "master" | "default";

export function adminLoginModeFromSearch(
  params: URLSearchParams | { get: (key: string) => string | null },
): AdminLoginMode {
  const master = params.get("master");
  if (master === "1" || master === "true" || master === "master") return "master";

  const segment = params.get("segment")?.trim().toLowerCase();
  if (segment === "higher") return "higher";
  if (segment === "schools") return "schools";

  const school = params.get("school");
  if (school === "1" || school === "true" || school === "school") return "schools";

  return "default";
}

export function adminLoginPathForMode(mode: AdminLoginMode): string {
  if (mode === "master") return PLATFORM_MASTER_LOGIN_PATH;
  if (mode === "higher") return `${ADMIN_LOGIN_PATH}?segment=higher`;
  if (mode === "schools") return SCHOOL_ADMIN_LOGIN_PATH;
  return ADMIN_LOGIN_PATH;
}

export const ADMIN_LOGIN_COPY = {
  higher: {
    title: "OdelPay — Higher",
    subtitle: "Universities, polytechnics, tertiary — sign in to your institution admin dashboard.",
    hint:
      "Register at /admin/register?segment=higher, confirm your email, then track your workspace at /school/workspace-status. When active, use the admin credentials sent to your contact email or shared by the platform master.",
    submit: "Sign in to institution dashboard",
  },
  schools: {
    title: "OdelPay — Schools",
    subtitle: "Primary / secondary schools — sign in to your school admin dashboard.",
    hint:
      "Register at /admin/register?segment=schools, confirm your email, then track approval at /school/workspace-status. When your workspace is active, admin credentials are emailed automatically (when that policy is on) or shared by the platform master. Students use /student/login — not this page.",
    submit: "Sign in to school dashboard",
  },
  master: {
    title: "Platform Master",
    subtitle: "Sign in with your ODELPay HUB platform operator credentials.",
    hint: "Master accounts manage all schools and higher institutions, approvals, FX, and integrations.",
    submit: "Sign in to master console",
  },
  default: {
    title: "Admin sign in",
    subtitle: "Choose your OdelPay product line or platform master access below.",
    hint: null as string | null,
    submit: "Sign in",
  },
} as const;

/** @deprecated Use `schools` mode — kept for callers expecting legacy key. */
export const ADMIN_LOGIN_COPY_LEGACY = {
  school: ADMIN_LOGIN_COPY.schools,
};
