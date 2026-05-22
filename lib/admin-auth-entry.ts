/** Shared URLs and copy helpers for tuition / school admin sign-in. */

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
    subtitle: "Sign in with the email and password your institution received from ODEL HUB.",
    hint:
      "After your school workspace is approved, the platform operator creates your account. Use those credentials here — not your student login.",
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
