import { prisma } from "@/lib/prisma";

export type MerchantFeeBreakdown = {
  orderAmountUgx: number;
  platformFeeUgx: number;
  whiteLabelFeeUgx: number;
  merchantFeeUgx: number;
  customerTotalUgx: number;
  merchantNetUgx: number;
  platformFeePayer: "pass_through" | "absorb";
  platformFeeKind: string;
  platformFeePercent: number;
  whiteLabelMode: boolean;
  notes: string[];
};

function roundUgx(n: number): number {
  return Math.max(0, Math.round(n));
}

/** Resolve OPGB platform fee for a merchant order (includes white-label surcharge when enabled). */
export async function quoteMerchantChargeFees(opts: {
  developerAppId: string;
  orderAmountUgx: number;
}): Promise<MerchantFeeBreakdown> {
  const order = Math.max(0, Math.round(opts.orderAmountUgx));
  const app = await prisma.developerApp.findUnique({
    where: { id: opts.developerAppId },
    select: {
      platformFeePayer: true,
      merchantSurchargePercent: true,
      merchantSurchargeFixedUgx: true,
      platformFeeOverrideKind: true,
      platformFeeOverrideUgx: true,
      platformFeeOverridePercent: true,
      whiteLabelMode: true,
    },
  });

  const site = await prisma.siteUiSettings.findFirst({
    where: { key: "platform" },
    select: {
      merchantChargePlatformFeeKind: true,
      merchantChargePlatformFeeUgx: true,
      merchantChargePlatformFeePercent: true,
      merchantChargePlatformFeeMinUgx: true,
      whiteLabelFeeKind: true,
      whiteLabelFeeUgx: true,
      whiteLabelFeePercent: true,
    },
  });

  const notes: string[] = [];
  let kind = (app?.platformFeeOverrideKind || "inherit").toLowerCase();
  let feeUgx = 0;
  let feePercent = 0;

  if (kind === "inherit") {
    kind = (site?.merchantChargePlatformFeeKind || "percent").toLowerCase();
    feeUgx = site?.merchantChargePlatformFeeUgx ?? 0;
    feePercent = site?.merchantChargePlatformFeePercent ?? 2.5;
  } else if (kind === "fixed_ugx") {
    feeUgx = app?.platformFeeOverrideUgx ?? 0;
  } else if (kind === "percent") {
    feePercent = app?.platformFeeOverridePercent ?? 0;
  } else if (kind === "none") {
    feeUgx = 0;
    feePercent = 0;
  }

  let basePlatformFeeUgx = 0;
  if (kind === "fixed_ugx") {
    basePlatformFeeUgx = Math.max(0, feeUgx);
    notes.push(`OPGB fixed fee ${basePlatformFeeUgx.toLocaleString()} UGX`);
  } else if (kind === "percent") {
    basePlatformFeeUgx = roundUgx((order * feePercent) / 100);
    const minFee = site?.merchantChargePlatformFeeMinUgx ?? 500;
    if (minFee > 0 && basePlatformFeeUgx < minFee && order > 0) {
      basePlatformFeeUgx = minFee;
      notes.push(`OPGB ${feePercent}% (min ${minFee.toLocaleString()} UGX)`);
    } else {
      notes.push(`OPGB ${feePercent}%`);
    }
  } else {
    notes.push("OPGB base fee waived for this app");
  }

  let whiteLabelFeeUgx = 0;
  const whiteLabelMode = Boolean(app?.whiteLabelMode);
  if (whiteLabelMode) {
    const wlKind = (site?.whiteLabelFeeKind || "percent").toLowerCase();
    if (wlKind === "fixed_ugx") {
      whiteLabelFeeUgx = Math.max(0, site?.whiteLabelFeeUgx ?? 0);
      if (whiteLabelFeeUgx > 0) {
        notes.push(`White-label fixed fee ${whiteLabelFeeUgx.toLocaleString()} UGX`);
      }
    } else if (wlKind === "percent") {
      const wlPct = site?.whiteLabelFeePercent ?? 1;
      whiteLabelFeeUgx = roundUgx((order * wlPct) / 100);
      if (whiteLabelFeeUgx > 0) {
        notes.push(`White-label ${wlPct}% (${whiteLabelFeeUgx.toLocaleString()} UGX)`);
      }
    }
  }

  const platformFeeUgx = basePlatformFeeUgx + whiteLabelFeeUgx;

  const surchargePct = Math.max(0, app?.merchantSurchargePercent ?? 0);
  const surchargeFixed = Math.max(0, app?.merchantSurchargeFixedUgx ?? 0);
  const merchantFeeUgx = roundUgx((order * surchargePct) / 100) + surchargeFixed;
  if (merchantFeeUgx > 0) {
    notes.push(`Merchant surcharge ${merchantFeeUgx.toLocaleString()} UGX`);
  }

  const payerRaw = (app?.platformFeePayer || "pass_through").toLowerCase();
  const platformFeePayer: "pass_through" | "absorb" =
    payerRaw === "absorb" ? "absorb" : "pass_through";

  let customerTotalUgx = order + merchantFeeUgx;
  let merchantNetUgx = order + merchantFeeUgx;

  if (platformFeePayer === "pass_through") {
    customerTotalUgx += platformFeeUgx;
    merchantNetUgx = order + merchantFeeUgx;
    notes.push("Customer pays OPGB fee (pass-through)");
  } else {
    merchantNetUgx = Math.max(0, order + merchantFeeUgx - platformFeeUgx);
    notes.push("Merchant absorbs OPGB fee");
  }

  return {
    orderAmountUgx: order,
    platformFeeUgx,
    whiteLabelFeeUgx,
    merchantFeeUgx,
    customerTotalUgx,
    merchantNetUgx,
    platformFeePayer,
    platformFeeKind: kind,
    platformFeePercent: feePercent,
    whiteLabelMode,
    notes,
  };
}
