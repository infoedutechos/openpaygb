import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminFromCookies } from "@/lib/auth";
import {
  verifyAdminSessionToken,
  verifyAdminItemSessionToken,
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_ITEM_COOKIE_NAME,
  isItemGateEnabled,
} from "@/utils/admin-session";
import ItemPasswordGate from "./ItemPasswordGate";

export const dynamic = "force-dynamic";

const ITEM_PROTECTED_PATHS = [
  "/admin/accounts",
  "/admin/bot-users",
  "/admin/tasks",
  "/admin/daily-cipher",
  "/admin/daily-combo",
  "/admin/cards",
  "/admin/weekly-event",
  "/admin/onchain-tasks",
  "/admin/export",
  "/admin/fees-collection",
  "/admin/staking-audit",
  "/admin/league-management",
  "/admin/global-tasks",
  "/admin/quiz",
  "/admin/daily-pattern",
  "/admin/shop",
];

function isItemProtectedPath(pathname: string): boolean {
  return ITEM_PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const rawPath = headersList.get("x-pathname") || "";
  /** `/school-admin/*` rewrites to `/admin/*`; normalize for URA item-gate path checks. */
  const pathname = rawPath.replace(/^\/school-admin(\/|$)/, "/admin$1");
  const host = headersList.get("host") || "";
  const cookieStore = await cookies();

  const isLoginPage = pathname === "/admin/login";
  const isResetPasswordPage =
    pathname === "/admin/reset-password" || pathname.startsWith("/admin/reset-password/");
  const isRegisterPage = pathname === "/admin/register" || pathname.startsWith("/admin/register/");
  const isNotificationsPanel =
    pathname === "/admin/notifications" || pathname.startsWith("/admin/notifications/");

  if (isLoginPage || isResetPasswordPage || isRegisterPage || isNotificationsPanel) {
    return <>{children}</>;
  }

  const payAdmin = await getAdminFromCookies();
  const uraSession = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const uraOk = verifyAdminSessionToken(uraSession);
  const localhostAuth = host.includes("localhost") && process.env.ACCESS_ADMIN === "true";

  const isAuthorized = Boolean(payAdmin) || uraOk || localhostAuth;
  if (!isAuthorized) {
    redirect("/admin/login");
  }

  if (
    isItemGateEnabled() &&
    !payAdmin &&
    uraOk &&
    isItemProtectedPath(pathname)
  ) {
    const itemCookie = cookieStore.get(ADMIN_ITEM_COOKIE_NAME)?.value;
    if (!verifyAdminItemSessionToken(itemCookie)) {
      return <ItemPasswordGate pathname={pathname} />;
    }
  }

  return <>{children}</>;
}
