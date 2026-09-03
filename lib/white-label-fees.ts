import { prisma } from "@/lib/prisma";

/** Debit one-time white-label activation fee (idempotent if already activated). */
export async function activateWhiteLabelIfNeeded(developerAppId: string): Promise<{
  activated: boolean;
  activationFeeUgx: number;
  alreadyActive: boolean;
}> {
  const app = await prisma.developerApp.findUnique({
    where: { id: developerAppId },
    select: {
      whiteLabelMode: true,
      whiteLabelActivatedAt: true,
      settlementBalanceUgx: true,
    },
  });
  if (!app) throw new Error("App not found");

  if (app.whiteLabelActivatedAt) {
    if (!app.whiteLabelMode) {
      await prisma.developerApp.update({
        where: { id: developerAppId },
        data: { whiteLabelMode: true },
      });
    }
    return { activated: true, activationFeeUgx: 0, alreadyActive: true };
  }

  const site = await prisma.siteUiSettings.findFirst({
    where: { key: "platform" },
    select: { whiteLabelActivationFeeUgx: true },
  });
  const fee = Math.max(0, site?.whiteLabelActivationFeeUgx ?? 0);

  if (fee <= 0) {
    await prisma.developerApp.update({
      where: { id: developerAppId },
      data: {
        whiteLabelMode: true,
        whiteLabelActivatedAt: new Date(),
        whiteLabelActivationPaidUgx: 0,
      },
    });
    return { activated: true, activationFeeUgx: 0, alreadyActive: false };
  }

  if (app.settlementBalanceUgx < fee) {
    throw new Error(
      `White-label activation costs ${fee.toLocaleString()} UGX. Available settlement: ${app.settlementBalanceUgx.toLocaleString()} UGX. Collect more payments first, or ask OpenPayGB to waive the activation fee.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.developerApp.update({
      where: { id: developerAppId },
      data: {
        settlementBalanceUgx: { decrement: fee },
        whiteLabelMode: true,
        whiteLabelActivatedAt: new Date(),
        whiteLabelActivationPaidUgx: fee,
      },
    });
  });

  return { activated: true, activationFeeUgx: fee, alreadyActive: false };
}

export async function getWhiteLabelPricing() {
  const site = await prisma.siteUiSettings.findFirst({
    where: { key: "platform" },
    select: {
      whiteLabelFeeKind: true,
      whiteLabelFeeUgx: true,
      whiteLabelFeePercent: true,
      whiteLabelActivationFeeUgx: true,
      merchantChargePlatformFeeKind: true,
      merchantChargePlatformFeeUgx: true,
      merchantChargePlatformFeePercent: true,
      merchantChargePlatformFeeMinUgx: true,
    },
  });

  return {
    whiteLabelFeeKind: site?.whiteLabelFeeKind ?? "percent",
    whiteLabelFeeUgx: site?.whiteLabelFeeUgx ?? 0,
    whiteLabelFeePercent: site?.whiteLabelFeePercent ?? 1,
    whiteLabelActivationFeeUgx: site?.whiteLabelActivationFeeUgx ?? 0,
    merchantChargePlatformFeeKind: site?.merchantChargePlatformFeeKind ?? "percent",
    merchantChargePlatformFeeUgx: site?.merchantChargePlatformFeeUgx ?? 0,
    merchantChargePlatformFeePercent: site?.merchantChargePlatformFeePercent ?? 2.5,
    merchantChargePlatformFeeMinUgx: site?.merchantChargePlatformFeeMinUgx ?? 500,
  };
}
