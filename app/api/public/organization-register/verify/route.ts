import { NextResponse } from "next/server";
import { PUBLIC_SCHOOL_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { activatePendingOrganizationWorkspace } from "@/lib/org-activate-pending";
import { isSchoolWorkspaceMasterApprovalRequired } from "@/lib/school-workspace-registration-policy";
import {
  verifyOrganizationWorkspaceToken,
  WORKSPACE_VERIFY_FAIL_MESSAGES,
  workspaceVerifyFailMessage,
} from "@/lib/organization-workspace-verify";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

/**
 * Email confirmation for school workspace registration → redirect to school admin sign-in.
 */
export async function GET(req: Request) {
  if (rateLimitHit(`org-verify:${clientIp(req)}`, 30, 60 * 60 * 1000)) {
    const loginBase = new URL(PUBLIC_SCHOOL_LOGIN_PATH, new URL(req.url).origin);
    loginBase.searchParams.set("workspaceVerifyError", "Too many verification attempts. Try again later.");
    return NextResponse.redirect(loginBase);
  }
  const url = new URL(req.url);
  const plain = url.searchParams.get("token")?.trim();
  const loginBase = new URL(PUBLIC_SCHOOL_LOGIN_PATH, url.origin);

  if (!plain) {
    loginBase.searchParams.set("workspaceVerifyError", WORKSPACE_VERIFY_FAIL_MESSAGES.missing);
    return NextResponse.redirect(loginBase);
  }

  const result = await verifyOrganizationWorkspaceToken(plain);
  if (!result.ok) {
    loginBase.searchParams.set("workspaceVerifyError", workspaceVerifyFailMessage(result.reason));
    if (result.reason === "expired") {
      loginBase.searchParams.set("workspaceVerifyExpired", "1");
    }
    return NextResponse.redirect(loginBase);
  }

  const org = await prisma.organization.findUnique({
    where: { id: result.organizationId },
    select: { slug: true },
  });
  const statusUrl = new URL("/school/workspace-status", url.origin);
  if (org?.slug) statusUrl.searchParams.set("slug", org.slug);

  const requireMasterApproval = await isSchoolWorkspaceMasterApprovalRequired();
  if (!requireMasterApproval) {
    try {
      await activatePendingOrganizationWorkspace(result.organizationId);
      statusUrl.searchParams.set("activated", "1");
      return NextResponse.redirect(statusUrl);
    } catch (e) {
      console.error("[organization-register/verify] auto-activate failed", e);
      loginBase.searchParams.set(
        "workspaceVerifyError",
        "Email confirmed, but automatic workspace activation failed. Contact platform support or try again later.",
      );
      return NextResponse.redirect(loginBase);
    }
  }

  statusUrl.searchParams.set("verified", "1");
  return NextResponse.redirect(statusUrl);
}
