import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";
import { getPublicOrigin } from "@/lib/public-url";
import { prisma } from "@/lib/prisma";

export const WORKSPACE_VERIFY_TTL_MS = 72 * 60 * 60 * 1000;

export function organizationWorkspaceVerifyPath(plainToken: string): string {
  return `/api/public/organization-register/verify?token=${encodeURIComponent(plainToken)}`;
}

export function organizationWorkspaceVerifyUrlForRequest(req: Request, plainToken: string): string {
  const path = organizationWorkspaceVerifyPath(plainToken);
  const envOrigin = getPublicOrigin();
  if (envOrigin) return `${envOrigin}${path}`;
  return `${new URL(req.url).origin}${path}`;
}

/** Issue a fresh verification token for a pending workspace (replaces any prior token). */
export async function issueOrganizationWorkspaceVerifyToken(organizationId: string): Promise<string> {
  const plain = newAdminResetTokenPlain();
  const tokenHash = hashAdminResetToken(plain);
  const expiresAt = new Date(Date.now() + WORKSPACE_VERIFY_TTL_MS);

  await prisma.$transaction([
    prisma.organizationWorkspaceVerifyToken.deleteMany({ where: { organizationId } }),
    prisma.organizationWorkspaceVerifyToken.create({
      data: { organizationId, tokenHash, expiresAt },
    }),
  ]);

  return plain;
}

export type WorkspaceVerifyResult =
  | { ok: true; organizationId: string }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "already" };

export async function verifyOrganizationWorkspaceToken(plain: string): Promise<WorkspaceVerifyResult> {
  const tokenHash = hashAdminResetToken(plain);
  const row = await prisma.organizationWorkspaceVerifyToken.findUnique({
    where: { tokenHash },
    include: { organization: { select: { id: true, registrationEmailVerifiedAt: true } } },
  });

  if (!row) return { ok: false, reason: "invalid" };
  if (row.verifiedAt || row.organization.registrationEmailVerifiedAt) {
    return { ok: true, organizationId: row.organizationId };
  }
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const now = new Date();
  await prisma.$transaction([
    prisma.organizationWorkspaceVerifyToken.update({
      where: { id: row.id },
      data: { verifiedAt: now },
    }),
    prisma.organization.update({
      where: { id: row.organizationId },
      data: { registrationEmailVerifiedAt: now },
    }),
  ]);

  return { ok: true, organizationId: row.organizationId };
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
export function canMasterApproveWorkspace(_org: {
  registrationContactEmail: string;
  registrationEmailVerifiedAt: Date | string | null;
}): boolean {
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

export function workspaceVerifyFailMessage(
  reason: Extract<WorkspaceVerifyResult, { ok: false }>["reason"],
): string {
  if (reason === "expired") return WORKSPACE_VERIFY_FAIL_MESSAGES.expired;
  if (reason === "missing") return WORKSPACE_VERIFY_FAIL_MESSAGES.missing;
  return WORKSPACE_VERIFY_FAIL_MESSAGES.invalid;
}

export function workspaceEmailVerifyStatus(org: {
  registrationContactEmail: string;
  registrationEmailVerifiedAt: Date | string | null;
}): WorkspaceEmailVerifyStatus {
  if (!org.registrationContactEmail?.trim()) return "none";
  return org.registrationEmailVerifiedAt ? "verified" : "pending";
}
