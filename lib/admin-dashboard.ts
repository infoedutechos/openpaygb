import type { AdminJwtPayload } from "@/lib/auth";

/** Minimal role snapshot for shell nav (no cookie parsing on the client). */
export type SignedAdminSnapshot = Pick<AdminJwtPayload, "role">;

/** True when the URL is an authenticated admin surface (not login / notifications). */
export function pathnameIsUnderAdminDashboard(pathname: string, admin: SignedAdminSnapshot | null): boolean {
  if (!admin) return false;
  if (!pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/admin/login")) return false;
  if (pathname.startsWith("/admin/notifications")) return false;
  return true;
}

/** Dashboard entry for footer / shell: masters go to the Manager console, org admins to the tuition hub. */
export function adminDashboardHref(admin: SignedAdminSnapshot | null): string {
  if (!admin) return "/admin/login";
  if (admin.role === "master") return "/admin/master";
  return "/admin";
}
