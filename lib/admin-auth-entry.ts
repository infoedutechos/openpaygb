/** Shared URLs and copy helpers for tuition / school admin sign-in. */

/** Public-friendly URL (rewrites to {@link SCHOOL_ADMIN_LOGIN_PATH}). */
export const PUBLIC_SCHOOL_LOGIN_PATH = "/school/login";
export const SCHOOL_ADMIN_LOGIN_PATH = "/admin/login?school=1";
export const PLATFORM_MASTER_LOGIN_PATH = "/admin/login?master=1";
export const ADMIN_LOGIN_PATH = "/admin/login";

export type AdminLoginMode = "school" | "master" | "default";

export function adminLoginModeFromSearch(
  params: URLSearchParams | { get: (key: string) => string | null },
): AdminLoginMode {
  const school = params.get("school");
  const master = params.get("master");
  if (school === "1" || school === "true" || school === "school") return "school";
  if (master === "1" || master === "true" || master === "master") return "master";
  return "default";
}

export function adminLoginPathForMode(mode: AdminLoginMode): string {
  if (mode === "school") return SCHOOL_ADMIN_LOGIN_PATH;
  if (mode === "master") return PLATFORM_MASTER_LOGIN_PATH;
  return ADMIN_LOGIN_PATH;
}

export const ADMIN_LOGIN_COPY = {
  school: {
    title: "School Admin Dashboard",
    subtitle:
      "Sign in with the admin email and password for your school workspace on OdelPay — Schools.",
    hint:
      "Register a new school at /admin/register?segment=schools, confirm your email, then track approval at /school/workspace-status. When your workspace is active, admin credentials are emailed automatically (when that policy is on) or shared by the platform master. This sign-in is for school staff — not the student portal (/student/login).",
    submit: "Sign in to school dashboard",
  },
  master: {
    title: "Platform Master Console",
    subtitle: "Sign in with your ODEL HUB platform operator credentials.",
    hint: "Master accounts manage all schools, approvals, FX, and integrations.",
    submit: "Sign in to master console",
  },
  default: {
    title: "Admin sign in",
    subtitle: "School staff and platform operators use the same sign-in page.",
    hint: null as string | null,
    submit: "Sign in",
  },
} as const;
