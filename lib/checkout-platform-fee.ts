import { prisma } from "@/lib/prisma";
import type { InstallmentCountOption } from "@/lib/installments";
import { splitSubtotalUgx } from "@/lib/installments";

const MAX_UGX = 1_000_000_000;
export const PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX = 1_000_000;

export type CheckoutPlatformFeeKind = "env" | "fixed_ugx" | "percent";
export type OrgCheckoutPlatformFeeKind = "inherit" | "fixed_ugx" | "percent";

export type CheckoutFeeRule =
  | { kind: "env" }
  | { kind: "fixed_ugx"; ugx: number }
  | { kind: "percent"; percent: number };

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

/** @deprecated Use getCheckoutPlatformFeeUgxFromEnv or computePlatformFeeUgx */
export function getCheckoutPlatformFeeUgx(): number {
  return getCheckoutPlatformFeeUgxFromEnv();
}

export function clampPercent(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0) return 0;
  return Math.min(percent, 100);
}

export function platformDefaultRuleFromRow(row: {
  checkoutPlatformFeeDefaultKind?: string | null;
  checkoutPlatformFeeDefaultUgx?: number | null;
  checkoutPlatformFeeDefaultPercent?: number | null;
} | null): CheckoutFeeRule {
  const kind = row?.checkoutPlatformFeeDefaultKind?.trim() as CheckoutPlatformFeeKind | undefined;
  const ugx = row?.checkoutPlatformFeeDefaultUgx ?? -1;
  const pct = row?.checkoutPlatformFeeDefaultPercent ?? 0;

  if (kind === "percent") {
    return { kind: "percent", percent: clampPercent(pct) };
  }
  if (kind === "fixed_ugx" || (!kind && ugx >= 0)) {
    return { kind: "fixed_ugx", ugx: Math.min(Math.round(ugx), MAX_UGX) };
  }
  return { kind: "env" };
}

export function orgRuleFromRow(row: {
  checkoutPlatformFeeKind?: string | null;
  checkoutPlatformFeeUgx?: number | null;
  checkoutPlatformFeePercent?: number | null;
}): CheckoutFeeRule | null {
  const kind = row.checkoutPlatformFeeKind?.trim() as OrgCheckoutPlatformFeeKind | undefined;
  const ugx = row.checkoutPlatformFeeUgx ?? -1;
  const pct = row.checkoutPlatformFeePercent ?? 0;

  if (!kind || kind === "inherit") {
    if (ugx >= 0) {
      return { kind: "fixed_ugx", ugx: Math.min(Math.round(ugx), MAX_UGX) };
    }
    return null;
  }
  if (kind === "percent") {
    return { kind: "percent", percent: clampPercent(pct) };
  }
  if (kind === "fixed_ugx") {
    return { kind: "fixed_ugx", ugx: ugx < 0 ? 0 : Math.min(Math.round(ugx), MAX_UGX) };
  }
  return null;
}

/** Compute processing charge in UGX for a tuition subtotal. */
export function computePlatformFeeUgx(subtotalUgx: number, rule: CheckoutFeeRule): number {
  const subtotal = Math.max(0, Math.round(subtotalUgx));
  if (rule.kind === "env") {
    return parseEnvFee();
  }
  if (rule.kind === "fixed_ugx") {
    return Math.min(Math.round(rule.ugx), MAX_UGX);
  }
  return Math.min(Math.round((subtotal * clampPercent(rule.percent)) / 100), MAX_UGX);
}

export function describeCheckoutFeeRule(rule: CheckoutFeeRule): string {
  if (rule.kind === "env") return "Environment default (CHECKOUT_PLATFORM_FEE_UGX)";
  if (rule.kind === "fixed_ugx") return `Fixed UGX ${rule.ugx.toLocaleString()}`;
  return `${rule.percent}% of tuition subtotal`;
}

/** Stale Prisma client after schema change — omit new fields until `npx prisma generate` + restart dev. */
export function isUnknownPlatformFeeFieldError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ((err as { name?: string }).name !== "PrismaClientValidationError") return false;
  const msg = String((err as { message?: string }).message ?? "");
  return (
    msg.includes("Unknown field") &&
    (msg.includes("checkoutPlatformFeeDefaultKind") ||
      msg.includes("checkoutPlatformFeeDefaultPercent") ||
      msg.includes("checkoutPlatformFeeKind") ||
      msg.includes("checkoutPlatformFeePercent"))
  );
}

export async function loadPlatformFeeSettingsRow() {
  try {
    return await prisma.siteUiSettings.findUnique({
      where: { key: "platform" },
      select: {
        checkoutPlatformFeeDefaultKind: true,
        checkoutPlatformFeeDefaultUgx: true,
        checkoutPlatformFeeDefaultPercent: true,
      },
    });
  } catch (err) {
    if (!isUnknownPlatformFeeFieldError(err)) throw err;
    return prisma.siteUiSettings.findUnique({
      where: { key: "platform" },
      select: { checkoutPlatformFeeDefaultUgx: true },
    });
  }
}

export async function getPlatformDefaultCheckoutFeeRule(): Promise<CheckoutFeeRule> {
  const row = await loadPlatformFeeSettingsRow();
  return platformDefaultRuleFromRow(row);
}

/** @deprecated Prefer resolveCheckoutPlatformFeeRule + computePlatformFeeUgx */
export async function getInheritedCheckoutPlatformFeeUgx(
  subtotalUgx = PLATFORM_FEE_PREVIEW_SUBTOTAL_UGX,
): Promise<number> {
  const rule = await getPlatformDefaultCheckoutFeeRule();
  return computePlatformFeeUgx(subtotalUgx, rule);
}

async function loadOrgFeeSettingsRow(organizationId: string) {
  try {
    return await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        checkoutPlatformFeeKind: true,
        checkoutPlatformFeeUgx: true,
        checkoutPlatformFeePercent: true,
      },
    });
  } catch (err) {
    if (!isUnknownPlatformFeeFieldError(err)) throw err;
    return prisma.organization.findUnique({
      where: { id: organizationId },
      select: { checkoutPlatformFeeUgx: true },
    });
  }
}

export async function resolveCheckoutPlatformFeeRule(organizationId: string): Promise<CheckoutFeeRule> {
  const org = await loadOrgFeeSettingsRow(organizationId);
  const orgRule = org ? orgRuleFromRow(org) : null;
  if (orgRule) return orgRule;
  return getPlatformDefaultCheckoutFeeRule();
}

/**
 * Effective platform / processing fee in UGX for checkout for this organization.
 * Pass the tuition **subtotal** (before fee) so percentage rules apply correctly.
 */
export async function getCheckoutPlatformFeeUgxForOrganization(
  organizationId: string,
  subtotalUgx = 0,
): Promise<number> {
  const rule = await resolveCheckoutPlatformFeeRule(organizationId);
  return computePlatformFeeUgx(subtotalUgx, rule);
}

export type InstallmentSliceFee = {
  index: number;
  subtotalUgx: number;
  platformFeeUgx: number;
  totalUgx: number;
};

/** Build installment slices; percent fees apply per slice subtotal, fixed UGX is per installment (legacy). */
export function buildInstallmentScheduleFromRule(
  subtotalUgx: number,
  rule: CheckoutFeeRule,
  count: InstallmentCountOption,
): {
  count: InstallmentCountOption;
  slices: InstallmentSliceFee[];
  fullSubtotalUgx: number;
  platformFeePerInstallmentUgx: number;
  fullPlanTotalUgx: number;
} {
  const parts = splitSubtotalUgx(subtotalUgx, count);
  const slices: InstallmentSliceFee[] = parts.map((sub, i) => {
    const platformFeeUgx =
      rule.kind === "fixed_ugx" ? Math.max(0, Math.round(rule.ugx)) : computePlatformFeeUgx(sub, rule);
    return {
      index: i + 1,
      subtotalUgx: sub,
      platformFeeUgx,
      totalUgx: sub + platformFeeUgx,
    };
  });
  const fullPlanTotalUgx = slices.reduce((s, x) => s + x.totalUgx, 0);
  return {
    count,
    slices,
    fullSubtotalUgx: Math.max(0, Math.round(subtotalUgx)),
    platformFeePerInstallmentUgx: slices[0]?.platformFeeUgx ?? 0,
    fullPlanTotalUgx,
  };
}
