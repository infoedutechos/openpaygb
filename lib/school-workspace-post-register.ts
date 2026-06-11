import "server-only";

import { activatePendingOrganizationWorkspace } from "@/lib/org-activate-pending";
import type { SchoolWorkspaceRegistrationPolicy } from "@/lib/school-workspace-registration-policy";
import { workspacePortalPath } from "@/lib/workspace-portal-url";

export type SchoolWorkspacePostRegisterResult = {
  activated: boolean;
  redirectUrl: string;
  message: string;
};

/** After self-serve register when email verification is deferred to the workspace portal. */
export async function completeDeferredSchoolWorkspaceRegistration(
  organizationId: string,
  slug: string,
  email: string,
  policy: SchoolWorkspaceRegistrationPolicy,
): Promise<SchoolWorkspacePostRegisterResult> {
  let activated = false;
  if (policy.autoRegistrationEnabled) {
    await activatePendingOrganizationWorkspace(organizationId);
    activated = true;
  }

  const redirectUrl = workspacePortalPath({
    slug,
    email,
    extra: {
      submitted: "1",
      ...(activated ? { activated: "1" } : {}),
    },
  });

  let message: string;
  if (activated && policy.autoGenerateAdminLogin) {
    message =
      "Your workspace is live. We sent a password-set link to your contact email — use it to sign in at /school/login.";
  } else if (activated) {
    message =
      "Your workspace is live. Sign in at /school/login when your school admin account is ready.";
  } else {
    message =
      "Your application was received. Track progress on your workspace portal and confirm your email when ready.";
  }

  return { activated, redirectUrl, message };
}
