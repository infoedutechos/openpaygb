import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/root-metadata";
import { quoteMerchantChargeFees } from "@/lib/merchant-charge-fees";

const CHARGE_TTL_MS = 60 * 60 * 1000;

export type MerchantChargeStatus =
  | "pending"
  | "collecting"
  | "confirmed"
  | "failed"
  | "expired"
  | "cancelled";

export function merchantChargeCheckoutPath(id: string): string {
  return `/opgb/checkout/${id}`;
}

export function merchantChargeCheckoutUrl(id: string): string {
  return `${appBaseUrl().replace(/\/$/, "")}${merchantChargeCheckoutPath(id)}`;
}

export async function createMerchantCharge(opts: {
  developerAppId: string;
  apiKeyId?: string | null;
  organizationId?: string | null;
  amountUgx: number;
  description?: string;
  metadata?: Record<string, unknown>;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  redirectUrl?: string;
  cancelUrl?: string;
  externalRef?: string;
}) {
  if (!Number.isFinite(opts.amountUgx) || opts.amountUgx < 500) {
    throw new Error("amountUgx must be at least 500 UGX");
  }

  const externalRef = opts.externalRef?.trim() ?? "";
  if (externalRef) {
    const existing = await prisma.merchantCharge.findFirst({
      where: { developerAppId: opts.developerAppId, externalRef },
    });
    if (existing) return existing;
  }

  const fees = await quoteMerchantChargeFees({
    developerAppId: opts.developerAppId,
    orderAmountUgx: opts.amountUgx,
  });

  return prisma.merchantCharge.create({
    data: {
      developerAppId: opts.developerAppId,
      apiKeyId: opts.apiKeyId ?? null,
      organizationId: opts.organizationId ?? null,
      orderAmountUgx: fees.orderAmountUgx,
      amountUgx: fees.customerTotalUgx,
      platformFeeUgx: fees.platformFeeUgx,
      merchantFeeUgx: fees.merchantFeeUgx,
      merchantNetUgx: fees.merchantNetUgx,
      feeBreakdownJson: JSON.stringify(fees),
      currency: "UGX",
      description: opts.description?.trim() ?? "",
      metadataJson: JSON.stringify(opts.metadata ?? {}),
      customerEmail: opts.customerEmail?.trim() ?? "",
      customerPhone: opts.customerPhone?.trim() ?? "",
      customerName: opts.customerName?.trim() ?? "",
      redirectUrl: opts.redirectUrl?.trim() ?? "",
      cancelUrl: opts.cancelUrl?.trim() ?? "",
      externalRef,
      status: "pending",
      expiresAt: new Date(Date.now() + CHARGE_TTL_MS),
    },
  });
}

type ChargeRow = {
  id: string;
  orderAmountUgx?: number;
  amountUgx: number;
  platformFeeUgx?: number;
  merchantFeeUgx?: number;
  merchantNetUgx?: number;
  feeBreakdownJson?: string;
  currency: string;
  description: string;
  metadataJson: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  redirectUrl: string;
  cancelUrl: string;
  externalRef: string;
  status: string;
  rail: string;
  momoReference: string;
  settledToMerchant?: boolean;
  paidAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

export function serializeMerchantCharge(row: ChargeRow, opts?: { includePrivate?: boolean }) {
  let metadata: unknown = {};
  try {
    metadata = JSON.parse(row.metadataJson || "{}");
  } catch {
    metadata = {};
  }
  let feeBreakdown: unknown = {};
  try {
    feeBreakdown = JSON.parse(row.feeBreakdownJson || "{}");
  } catch {
    feeBreakdown = {};
  }

  const expired = row.status === "pending" && row.expiresAt.getTime() < Date.now();
  const status = expired ? "expired" : row.status;
  const orderAmountUgx = row.orderAmountUgx && row.orderAmountUgx > 0 ? row.orderAmountUgx : row.amountUgx;

  return {
    id: row.id,
    orderAmountUgx,
    amountUgx: row.amountUgx,
    platformFeeUgx: row.platformFeeUgx ?? 0,
    merchantFeeUgx: row.merchantFeeUgx ?? 0,
    merchantNetUgx: row.merchantNetUgx ?? orderAmountUgx,
    feeBreakdown,
    currency: row.currency,
    description: row.description,
    metadata,
    customerEmail: row.customerEmail,
    customerPhone: opts?.includePrivate ? row.customerPhone : undefined,
    customerName: row.customerName,
    redirectUrl: row.redirectUrl,
    cancelUrl: row.cancelUrl,
    externalRef: row.externalRef || null,
    status,
    rail: row.rail || null,
    settledToMerchant: Boolean(row.settledToMerchant),
    paidAt: row.paidAt?.toISOString() ?? null,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    checkoutUrl: merchantChargeCheckoutUrl(row.id),
    checkoutPath: merchantChargeCheckoutPath(row.id),
  };
}

export async function getMerchantChargeForPublic(id: string) {
  const row = await prisma.merchantCharge.findUnique({
    where: { id },
    include: {
      developerApp: {
        select: {
          name: true,
          brandingName: true,
          brandingLogoUrl: true,
          brandingPrimaryColor: true,
          brandingAccentColor: true,
          whiteLabelMode: true,
          supportEmail: true,
          supportUrl: true,
          enabled: true,
        },
      },
    },
  });
  if (!row || !row.developerApp.enabled) return null;

  if (row.status === "pending" && row.expiresAt.getTime() < Date.now()) {
    await prisma.merchantCharge.update({
      where: { id: row.id },
      data: { status: "expired" },
    });
    row.status = "expired";
  }

  return row;
}

/** Confirm charge and credit merchant settlement balance (idempotent). */
export async function markMerchantChargeConfirmed(opts: {
  chargeId: string;
  rail: string;
  momoReference?: string;
}): Promise<{ action: string; charge: Awaited<ReturnType<typeof prisma.merchantCharge.findUnique>> }> {
  const charge = await prisma.merchantCharge.findUnique({ where: { id: opts.chargeId } });
  if (!charge) return { action: "unknown_charge", charge: null };
  if (charge.status === "confirmed") return { action: "already_confirmed", charge };
  if (charge.status === "cancelled" || charge.status === "expired") {
    return { action: "not_payable", charge };
  }

  const merchantNet =
    charge.merchantNetUgx > 0
      ? charge.merchantNetUgx
      : Math.max(0, (charge.orderAmountUgx || charge.amountUgx) - (charge.platformFeeUgx || 0));

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.merchantCharge.update({
      where: { id: opts.chargeId },
      data: {
        status: "confirmed",
        rail: opts.rail,
        momoReference: opts.momoReference?.trim() || charge.momoReference,
        paidAt: new Date(),
        merchantNetUgx: merchantNet,
        settledToMerchant: true,
      },
    });
    if (!charge.settledToMerchant && merchantNet > 0) {
      await tx.developerApp.update({
        where: { id: charge.developerAppId },
        data: { settlementBalanceUgx: { increment: merchantNet } },
      });
    }
    return row;
  });

  return { action: "charge_confirmed", charge: updated };
}

export async function markMerchantChargeFailed(chargeId: string): Promise<void> {
  const charge = await prisma.merchantCharge.findUnique({ where: { id: chargeId } });
  if (!charge || charge.status === "confirmed") return;
  await prisma.merchantCharge.update({
    where: { id: chargeId },
    data: { status: "failed" },
  });
}

export async function getMerchantSettlementSummary(developerAppId: string) {
  const app = await prisma.developerApp.findUnique({
    where: { id: developerAppId },
    select: {
      settlementBalanceUgx: true,
      payoutPhone: true,
      payoutNetwork: true,
      platformFeePayer: true,
      merchantSurchargePercent: true,
      merchantSurchargeFixedUgx: true,
      platformFeeOverrideKind: true,
      platformFeeOverrideUgx: true,
      platformFeeOverridePercent: true,
      whiteLabelMode: true,
      brandingName: true,
      brandingLogoUrl: true,
      brandingPrimaryColor: true,
      brandingAccentColor: true,
      supportEmail: true,
      supportUrl: true,
    },
  });
  if (!app) return null;

  const [confirmedAgg, pendingPayouts, paidPayouts, chargeCount] = await Promise.all([
    prisma.merchantCharge.aggregate({
      where: { developerAppId, status: "confirmed" },
      _sum: {
        amountUgx: true,
        orderAmountUgx: true,
        platformFeeUgx: true,
        merchantNetUgx: true,
      },
      _count: true,
    }),
    prisma.merchantPayout.aggregate({
      where: { developerAppId, status: "pending" },
      _sum: { amountUgx: true },
      _count: true,
    }),
    prisma.merchantPayout.aggregate({
      where: { developerAppId, status: "paid" },
      _sum: { amountUgx: true },
    }),
    prisma.merchantCharge.count({ where: { developerAppId } }),
  ]);

  return {
    availableBalanceUgx: app.settlementBalanceUgx,
    pendingPayoutUgx: pendingPayouts._sum.amountUgx ?? 0,
    pendingPayoutCount: pendingPayouts._count,
    totalPaidOutUgx: paidPayouts._sum.amountUgx ?? 0,
    lifetimeCollectedUgx: confirmedAgg._sum.amountUgx ?? 0,
    lifetimeOrderUgx: confirmedAgg._sum.orderAmountUgx ?? 0,
    lifetimePlatformFeesUgx: confirmedAgg._sum.platformFeeUgx ?? 0,
    lifetimeMerchantNetUgx: confirmedAgg._sum.merchantNetUgx ?? 0,
    confirmedChargeCount: confirmedAgg._count,
    totalChargeCount: chargeCount,
    payoutPhone: app.payoutPhone,
    payoutNetwork: app.payoutNetwork,
    feeSettings: {
      platformFeePayer: app.platformFeePayer,
      merchantSurchargePercent: app.merchantSurchargePercent,
      merchantSurchargeFixedUgx: app.merchantSurchargeFixedUgx,
      platformFeeOverrideKind: app.platformFeeOverrideKind,
      platformFeeOverrideUgx: app.platformFeeOverrideUgx,
      platformFeeOverridePercent: app.platformFeeOverridePercent,
    },
    branding: {
      brandingName: app.brandingName,
      brandingLogoUrl: app.brandingLogoUrl,
      brandingPrimaryColor: app.brandingPrimaryColor,
      brandingAccentColor: app.brandingAccentColor,
      whiteLabelMode: app.whiteLabelMode,
      supportEmail: app.supportEmail,
      supportUrl: app.supportUrl,
    },
  };
}
