import { prisma } from "@/lib/prisma";

const MAX_UGX = 1_000_000_000;

function parseEnvFee(): number {
  const raw = process.env.CHECKOUT_PLATFORM_FEE_UGX?.trim();
  if (!raw) return 0;
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n), MAX_UGX);
}

/** Deployment env `CHECKOUT_PLATFORM_FEE_UGX` only (ignores master-stored platform default). */
export function getCheckoutPlatformFeeUgxFromEnv(): number {
  return parseEnvFee();
}

/** @deprecated Use getCheckoutPlatformFeeUgxFromEnv or getCheckoutPlatformFeeUgxForOrganization */
export function getCheckoutPlatformFeeUgx(): number {
  return getCheckoutPlatformFeeUgxFromEnv();
}

/**
 * UGX charged when a tenant inherits the platform default (`checkoutPlatformFeeUgx` &lt; 0 on the organization).
 * Uses the master-configured platform default in the database when set (≥ 0), otherwise {@link getCheckoutPlatformFeeUgxFromEnv}.
 */
export async function getInheritedCheckoutPlatformFeeUgx(): Promise<number> {
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: "platform" },
    select: { checkoutPlatformFeeDefaultUgx: true },
  });
  const v = row?.checkoutPlatformFeeDefaultUgx ?? -1;
  if (v >= 0) {
    return Math.min(Math.round(v), MAX_UGX);
  }
  return getCheckoutPlatformFeeUgxFromEnv();
}

/**
 * Effective platform / processing fee in UGX for checkout for this organization.
 * Tenant value **below zero** (typically **-1**) means inherit {@link getInheritedCheckoutPlatformFeeUgx}.
 */
export async function getCheckoutPlatformFeeUgxForOrganization(organizationId: string): Promise<number> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { checkoutPlatformFeeUgx: true },
  });
  const v = org?.checkoutPlatformFeeUgx;
  if (v == null || v < 0) {
    return getInheritedCheckoutPlatformFeeUgx();
  }
  return Math.min(Math.round(v), MAX_UGX);
}
