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
import {
  isRelworxConfigured,
  isRelworxSuccessStatus,
  relworxCustomerReference,
  relworxNotConfiguredMessage,
  relworxRequestPayment,
} from "@/lib/relworx/client";
import {
  isVixonPayConfigured,
  isVixonPayWebhookSuccess,
  vixonPayCollectMoney,
  vixonPayMerchantReference,
  vixonPayNotConfiguredMessage,
} from "@/lib/vixonpay/client";
import { finalizeOpenPayCardMomoTopup } from "@/lib/openpay-card";
import { webhookAmountMatchesPayment } from "@/lib/webhook-payment-confirm";

export type CardMomoRail = "livepay" | "relworx" | "vixonpay";
export type CardMomoPurpose = "fund" | "issue";

export async function startOpenPayCardMomoTopup(opts: {
  cardId: string;
  amountUgx: number;
  rail: CardMomoRail;
  phone: string;
  network?: LivePayNetwork;
  customerEmail?: string;
  customerName?: string;
  purpose?: CardMomoPurpose;
}): Promise<{ topupId: string; message: string; reference: string }> {
  const topup = await prisma.openPayCardTopup.create({
    data: {
      cardId: opts.cardId,
      amountUgx: opts.amountUgx,
      tonAmount: 0,
      fundingRail: opts.rail,
      memo: `pending-${opts.cardId}-${Date.now()}`,
      status: "pending",
    },
  });

  const reference =
    opts.rail === "livepay"
      ? livePayCustomerReference(topup.id)
      : opts.rail === "vixonpay"
        ? vixonPayMerchantReference(topup.id)
        : relworxCustomerReference(topup.id);

  let message: string;
  let momoReference = reference;

  if (opts.rail === "livepay") {
    if (!isLivePayConfigured()) throw new Error(livePayNotConfiguredMessage());
    const collect = await livePayCollectMoney({
      phoneNumber: opts.phone,
      amountUgx: opts.amountUgx,
      reference,
      description:
        opts.purpose === "issue"
          ? "ODEL HUB OpenPayGB card activation"
          : "ODEL HUB OpenPayGB card top-up",
      network: opts.network,
    });
    message = collect.message;
    momoReference = collect.internal_reference?.trim() || reference;
  } else if (opts.rail === "vixonpay") {
    if (!isVixonPayConfigured()) throw new Error(vixonPayNotConfiguredMessage());
    const collect = await vixonPayCollectMoney({
      phone: opts.phone,
      amountUgx: opts.amountUgx,
      reference,
      description:
        opts.purpose === "issue"
          ? "ODEL HUB OpenPayGB card activation"
          : "ODEL HUB OpenPayGB card top-up",
      customerEmail: opts.customerEmail,
      customerName: opts.customerName,
    });
    message = collect.message;
    momoReference = collect.internal_reference?.trim() || reference;
  } else {
    if (!isRelworxConfigured()) throw new Error(relworxNotConfiguredMessage());
    const collect = await relworxRequestPayment({
      msisdn: opts.phone,
      amount: opts.amountUgx,
      reference,
      description:
        opts.purpose === "issue"
          ? "ODEL HUB OpenPayGB card activation"
          : "ODEL HUB OpenPayGB card top-up",
    });
    message = collect.message;
    momoReference = collect.internal_reference?.trim() || reference;
  }

  const memoPrefix = opts.purpose === "issue" ? "opcardissuemomo" : "opcardmomo";
  await prisma.openPayCardTopup.update({
    where: { id: topup.id },
    data: {
      memo: `${memoPrefix}:${topup.id}`,
      momoReference,
    },
  });

  return { topupId: topup.id, message, reference };
}

export async function confirmOpenPayCardTopupFromLivePay(
  topupId: string,
  input: {
    status: unknown;
    amount?: unknown;
    currency?: unknown;
    internal_reference?: unknown;
  },
): Promise<{ action: string }> {
  const topup = await prisma.openPayCardTopup.findUnique({ where: { id: topupId } });
  if (!topup || topup.fundingRail !== "livepay") {
    return { action: "unknown_topup" };
  }
  if (!isLivePayWebhookSuccess(input.status)) {
    return { action: "not_success" };
  }
  if (topup.status === "confirmed") {
    return { action: "already_confirmed" };
  }
  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
  const currency = typeof input.currency === "string" ? input.currency : "UGX";
  if (!webhookAmountMatchesPayment(topup.amountUgx, Number.isFinite(amount) ? amount : undefined, currency)) {
    return { action: "amount_mismatch" };
  }
  const internalRef =
    typeof input.internal_reference === "string" ? input.internal_reference.trim() : "";
  const txHash = internalRef || topup.momoReference || topupId;
  return finalizeOpenPayCardMomoTopup(topupId, txHash);
}

export async function confirmOpenPayCardTopupFromRelworx(
  topupId: string,
  input: {
    status?: unknown;
    request_status?: unknown;
    amount?: unknown;
    currency?: unknown;
    internal_reference?: unknown;
  },
): Promise<{ action: string }> {
  const topup = await prisma.openPayCardTopup.findUnique({ where: { id: topupId } });
  if (!topup || topup.fundingRail !== "relworx") {
    return { action: "unknown_topup" };
  }
  const okStatus =
    isRelworxSuccessStatus(input.status) || isRelworxSuccessStatus(input.request_status);
  if (!okStatus) return { action: "not_success" };
  if (topup.status === "confirmed") return { action: "already_confirmed" };

  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
  const currency = typeof input.currency === "string" ? input.currency : "UGX";
  if (!webhookAmountMatchesPayment(topup.amountUgx, Number.isFinite(amount) ? amount : undefined, currency)) {
    return { action: "amount_mismatch" };
  }
  const internalRef =
    typeof input.internal_reference === "string" ? input.internal_reference.trim() : "";
  const txHash = internalRef || topup.momoReference || topupId;
  return finalizeOpenPayCardMomoTopup(topupId, txHash);
}

export async function confirmOpenPayCardTopupFromVixonPay(
  topupId: string,
  input: {
    event?: unknown;
    transaction_status?: unknown;
    transaction_amount?: unknown;
    request_currency?: unknown;
    internal_reference?: unknown;
  },
): Promise<{ action: string }> {
  const topup = await prisma.openPayCardTopup.findUnique({ where: { id: topupId } });
  if (!topup || topup.fundingRail !== "vixonpay") {
    return { action: "unknown_topup" };
  }
  if (!isVixonPayWebhookSuccess(input.transaction_status)) {
    return { action: "not_success" };
  }
  if (topup.status === "confirmed") {
    return { action: "already_confirmed" };
  }
  const amount =
    typeof input.transaction_amount === "number"
      ? input.transaction_amount
      : Number(input.transaction_amount);
  const currency =
    typeof input.request_currency === "string" ? input.request_currency : "UGX";
  if (!webhookAmountMatchesPayment(topup.amountUgx, Number.isFinite(amount) ? amount : undefined, currency)) {
    return { action: "amount_mismatch" };
  }
  const internalRef =
    typeof input.internal_reference === "string" ? input.internal_reference.trim() : "";
  const txHash = internalRef || topup.momoReference || topupId;
  return finalizeOpenPayCardMomoTopup(topupId, txHash);
}
