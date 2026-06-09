export const WORKSPACE_VERIFY_TTL_MS = 72 * 60 * 60 * 1000;

export function organizationWorkspaceVerifyPath(plainToken: string): string {
  return `/api/public/organization-register/verify?token=${encodeURIComponent(plainToken)}`;
}

/** True when a registration contact email exists but the applicant has not confirmed it yet. */
export function workspaceEmailVerificationRequired(org: {
  registrationContactEmail: string;
  registrationEmailVerifiedAt: Date | string | null;
}): boolean {
  const email = org.registrationContactEmail?.trim() ?? "";
  if (!email) return false;
  return !org.registrationEmailVerifiedAt;
}

/** Master may approve pending workspaces even before email verification (email status shown in UI). */
export function canMasterApproveWorkspace(): boolean {
  return true;
}

export type WorkspaceEmailVerifyStatus = "none" | "pending" | "verified";

/** User-facing messages when verify link fails (login page + verify redirect). */
export const WORKSPACE_VERIFY_FAIL_MESSAGES = {
  missing: "Missing verification token",
  invalid: "Invalid or unknown verification link",
  expired:
    "This verification link has expired. Use Resend verification on the workspace request page, or submit a new request if needed.",
} as const;

export function workspaceEmailVerifyStatus(org: {
  registrationContactEmail: string;
  registrationEmailVerifiedAt: Date | string | null;
}): WorkspaceEmailVerifyStatus {
  if (!org.registrationContactEmail?.trim()) return "none";
  return org.registrationEmailVerifiedAt ? "verified" : "pending";
}
