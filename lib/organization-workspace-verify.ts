import { hashAdminResetToken, newAdminResetTokenPlain } from "@/lib/admin-password-reset";
import { getPublicOrigin } from "@/lib/public-url";
import { prisma } from "@/lib/prisma";

export {
  WORKSPACE_VERIFY_TTL_MS,
  WORKSPACE_VERIFY_FAIL_MESSAGES,
  canMasterApproveWorkspace,
  organizationWorkspaceVerifyPath,
  workspaceEmailVerificationRequired,
  workspaceEmailVerifyStatus,
} from "@/lib/organization-workspace-verify-shared";
export type { WorkspaceEmailVerifyStatus } from "@/lib/organization-workspace-verify-shared";

import {
  WORKSPACE_VERIFY_TTL_MS,
  organizationWorkspaceVerifyPath,
  WORKSPACE_VERIFY_FAIL_MESSAGES,
} from "@/lib/organization-workspace-verify-shared";

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

export function workspaceVerifyFailMessage(
  reason: Extract<WorkspaceVerifyResult, { ok: false }>["reason"],
): string {
  if (reason === "expired") return WORKSPACE_VERIFY_FAIL_MESSAGES.expired;
  if (reason === "missing") return WORKSPACE_VERIFY_FAIL_MESSAGES.missing;
  return WORKSPACE_VERIFY_FAIL_MESSAGES.invalid;
}
