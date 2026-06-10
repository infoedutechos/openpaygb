import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { getCachedAdminProfile } from "@/lib/cached-admin-profile";
import { isAdminManualPaymentConfirmAllowed } from "@/lib/admin-payment-confirm-policy";
import type { AuthMeJson, AuthMeOrganization } from "@/lib/auth-me";
import { workspaceEmailVerifyStatus } from "@/lib/organization-workspace-verify";
import { apiErrorResponse } from "@/lib/api-error";
import { isTransientMongoError } from "@/lib/prisma-retry";
import { ADMIN_SESSION_COOKIE_NAME, hasAdminShellAccess } from "@/utils/admin-session";

export async function GET() {
  try {
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

    let admin;
    try {
      admin = await getCachedAdminProfile(session.sub);
    } catch (e) {
      if (!isTransientMongoError(e)) throw e;
      const body: AuthMeJson = {
        admin: {
          id: session.sub,
          email: session.email,
          name: null,
          role: session.role,
          organizationId: null,
          organization: null,
        },
        tuitionSession: true,
        adminShellAccess,
        paymentOps,
        dbDegraded: true,
      };
      return NextResponse.json(body);
    }

    if (!admin) {
      const body: AuthMeJson = {
        admin: null,
        tuitionSession: false,
        adminShellAccess,
        paymentOps,
      };
      return NextResponse.json(body);
    }

    const organization: AuthMeOrganization | null = admin.organization
      ? {
          id: admin.organization.id,
          name: admin.organization.name,
          slug: admin.organization.slug,
          registrationContactEmail: admin.organization.registrationContactEmail ?? "",
          registrationEmailVerifiedAt: admin.organization.registrationEmailVerifiedAt
            ? admin.organization.registrationEmailVerifiedAt.toISOString()
            : null,
          emailVerifyStatus: workspaceEmailVerifyStatus({
            registrationContactEmail: admin.organization.registrationContactEmail ?? "",
            registrationEmailVerifiedAt: admin.organization.registrationEmailVerifiedAt,
          }),
        }
      : null;

    const hasProfileImage = Boolean(admin.profileImageUploadedAt);
    const profileImageUrl = hasProfileImage
      ? `/api/auth/admin/profile-image?v=${admin.profileImageUploadedAt!.getTime()}`
      : null;

    const body: AuthMeJson = {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        organizationId: admin.organizationId,
        organization,
        hasProfileImage,
        profileImageUrl,
        createdAt: admin.createdAt.toISOString(),
        lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
        previousLoginAt: admin.previousLoginAt?.toISOString() ?? null,
      },
      tuitionSession: true,
      adminShellAccess,
      paymentOps,
    };
    return NextResponse.json(body);
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/auth/me", fallback: "Could not load session" });
  }
}
