import "server-only";

import { prisma } from "@/lib/prisma";
import {
  isLivePayConfigured,
  isLivePayWebhookSuccess,
  livePayCollectMoney,
  livePayCustomerReference,
  livePayNotConfiguredMessage,
  type LivePayNetwork,
} from "@/lib/livepay/client";
import { webhookAmountMatchesPayment } from "@/lib/webhook-payment-confirm";
import {
  markMerchantChargeConfirmed,
  markMerchantChargeFailed,
  serializeMerchantCharge,
} from "@/lib/merchant-charge";
import { dispatchMerchantChargeWebhook } from "@/lib/merchant-charge-webhooks";

export function merchantChargesSandboxEnabled(): boolean {
  if (process.env.OPENPAYGB_CHARGES_SANDBOX === "1") return true;
  if (process.env.OPENPAYGB_CHARGES_SANDBOX === "0") return false;
  return process.env.NODE_ENV !== "production" && !isLivePayConfigured();
}

export async function startMerchantChargeLivePayCollect(opts: {
  chargeId: string;
  phone: string;
  network?: LivePayNetwork;
}): Promise<{ message: string; reference: string; sandbox?: boolean }> {
  const charge = await prisma.merchantCharge.findUnique({ where: { id: opts.chargeId } });
  if (!charge) throw new Error("Charge not found");
  if (charge.status === "confirmed") throw new Error("Charge already paid");
  if (charge.status === "cancelled" || charge.status === "expired") {
    throw new Error("Charge is no longer payable");
  }
  if (charge.expiresAt.getTime() < Date.now()) {
    await prisma.merchantCharge.update({ where: { id: charge.id }, data: { status: "expired" } });
    throw new Error("Charge expired");
  }

  const reference = livePayCustomerReference(charge.id);

  if (merchantChargesSandboxEnabled()) {
    await prisma.merchantCharge.update({
      where: { id: charge.id },
      data: {
        status: "collecting",
        rail: "sandbox",
        momoReference: reference,
        customerPhone: opts.phone.trim(),
      },
    });
    return {
      message: "Sandbox mode: approve the payment on this page (LivePay is not configured).",
      reference,
      sandbox: true,
    };
  }

  if (!isLivePayConfigured()) throw new Error(livePayNotConfiguredMessage());

  const collect = await livePayCollectMoney({
    phoneNumber: opts.phone,
    amountUgx: charge.amountUgx,
    reference,
    description: charge.description || `OpenPayGB charge ${charge.id}`,
    network: opts.network,
  });

  await prisma.merchantCharge.update({
    where: { id: charge.id },
    data: {
      status: "collecting",
      rail: "livepay",
      momoReference: collect.internal_reference?.trim() || reference,
      customerPhone: opts.phone.trim(),
    },
  });

  return {
    message: collect.message || "Check your phone to approve the Mobile Money prompt.",
    reference,
  };
}

export async function confirmMerchantChargeFromLivePay(
  chargeId: string,
  input: {
    status: unknown;
    amount?: unknown;
    currency?: unknown;
    internal_reference?: unknown;
  },
): Promise<{ action: string }> {
  const charge = await prisma.merchantCharge.findUnique({ where: { id: chargeId } });
  if (!charge) return { action: "unknown_charge" };
  if (charge.rail === "sandbox") return { action: "not_livepay" };

  if (!isLivePayWebhookSuccess(input.status)) {
    if (String(input.status).toLowerCase().includes("fail")) {
      await markMerchantChargeFailed(chargeId);
      const failed = serializeMerchantCharge(charge);
      void dispatchMerchantChargeWebhook("charge.failed", failed, charge.developerAppId);
      return { action: "charge_failed" };
    }
    return { action: "not_success" };
  }

  if (charge.status === "confirmed") return { action: "already_confirmed" };

  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
  const currency = typeof input.currency === "string" ? input.currency : "UGX";
  if (!webhookAmountMatchesPayment(charge.amountUgx, Number.isFinite(amount) ? amount : undefined, currency)) {
    return { action: "amount_mismatch" };
  }

  const internalRef =
    typeof input.internal_reference === "string" ? input.internal_reference.trim() : "";
  const result = await markMerchantChargeConfirmed({
    chargeId,
    rail: "livepay",
    momoReference: internalRef || charge.momoReference || chargeId,
  });

  if (result.action === "charge_confirmed" && result.charge) {
    void dispatchMerchantChargeWebhook(
      "charge.confirmed",
      serializeMerchantCharge(result.charge),
      charge.developerAppId,
    );
  }

  return { action: result.action };
}

export async function confirmMerchantChargeSandbox(chargeId: string): Promise<{ action: string }> {
  if (!merchantChargesSandboxEnabled()) {
    throw new Error("Sandbox confirm is disabled");
  }
  const charge = await prisma.merchantCharge.findUnique({ where: { id: chargeId } });
  if (!charge) throw new Error("Charge not found");
  const result = await markMerchantChargeConfirmed({
    chargeId,
    rail: "sandbox",
    momoReference: charge.momoReference || livePayCustomerReference(chargeId),
  });
  if (result.action === "charge_confirmed" && result.charge) {
    void dispatchMerchantChargeWebhook(
      "charge.confirmed",
      serializeMerchantCharge(result.charge),
      charge.developerAppId,
    );
  }
  return { action: result.action };
}
