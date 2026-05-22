import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { getCachedAdminProfile } from "@/lib/cached-admin-profile";
import { isAdminManualPaymentConfirmAllowed } from "@/lib/admin-payment-confirm-policy";
import type { AuthMeJson } from "@/lib/auth-me";
import { ADMIN_SESSION_COOKIE_NAME, hasAdminShellAccess } from "@/utils/admin-session";

export async function GET() {
  const cookieStore = await cookies();
  const host = (await headers()).get("host") ?? "";
  const adminShellAccess = hasAdminShellAccess(cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value, host);
  const paymentOps = { manualConfirmAllowed: isAdminManualPaymentConfirmAllowed() };

  const session = await getAdminFromCookies();
  if (!session) {
    const body: AuthMeJson = {
      admin: null,
      tuitionSession: false,
      adminShellAccess,
      paymentOps,
    };
    return NextResponse.json(body);
  }
  const admin = await getCachedAdminProfile(session.sub);
  if (!admin) {
    const body: AuthMeJson = {
      admin: null,
      tuitionSession: false,
      adminShellAccess,
      paymentOps,
    };
    return NextResponse.json(body);
  }
  const body: AuthMeJson = {
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      organizationId: admin.organizationId,
      organization: admin.organization,
    },
    tuitionSession: true,
    adminShellAccess,
    paymentOps,
  };
  return NextResponse.json(body);
}
