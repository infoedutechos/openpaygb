import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";

/** When true (default), pending workspaces need master approval after email verification. */
export async function isSchoolWorkspaceMasterApprovalRequired(): Promise<boolean> {
  try {
    const row = await prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: { schoolWorkspaceRequireMasterApproval: true },
    });
    return row?.schoolWorkspaceRequireMasterApproval ?? true;
  } catch (err) {
    if (isUnknownSchoolWorkspacePolicyFieldError(err)) return true;
    throw err;
  }
}

export function isUnknownSchoolWorkspacePolicyFieldError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  if (name !== "PrismaClientValidationError") return false;
  const msg = String((err as { message?: string }).message ?? "");
  return msg.includes("schoolWorkspaceRequireMasterApproval") && msg.includes("Unknown field");
}

export type SchoolWorkspaceRegistrationPolicy = {
  /** When true, master must approve after applicant verifies email. */
  requireMasterApproval: boolean;
  /** Inverse label for UI: auto-registration is on when master approval is off. */
  autoRegistrationEnabled: boolean;
  /** When true, platform creates org_admin + invite on workspace activation. */
  autoGenerateAdminLogin: boolean;
};

function isUnknownAutoAdminFieldError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  if (name !== "PrismaClientValidationError") return false;
  const msg = String((err as { message?: string }).message ?? "");
  return msg.includes("schoolWorkspaceAutoGenerateAdminLogin") && msg.includes("Unknown field");
}

export async function isSchoolWorkspaceAutoAdminLoginEnabled(): Promise<boolean> {
  try {
    const row = await prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: { schoolWorkspaceAutoGenerateAdminLogin: true },
    });
    return row?.schoolWorkspaceAutoGenerateAdminLogin ?? false;
  } catch (err) {
    if (isUnknownAutoAdminFieldError(err)) return false;
    throw err;
  }
}

export async function getSchoolWorkspaceRegistrationPolicy(): Promise<SchoolWorkspaceRegistrationPolicy> {
  const requireMasterApproval = await isSchoolWorkspaceMasterApprovalRequired();
  const autoGenerateAdminLogin = await isSchoolWorkspaceAutoAdminLoginEnabled();
  return {
    requireMasterApproval,
    autoRegistrationEnabled: !requireMasterApproval,
    autoGenerateAdminLogin,
  };
}
