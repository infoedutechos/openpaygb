/**
 * VixonPay REST API — https://docs.vixonpay.com/pay
 * Uganda UGX mobile money collections.
 */

import { deploymentEnv } from "@/lib/deployment-env-resolve";

const VIXONPAY_API_BASE = "https://my.vixonpay.com/api/v1";

export function isVixonPayConfigured(): boolean {
  return Boolean(deploymentEnv("VIXONPAY_API_KEY"));
}

export function vixonPayNotConfiguredMessage(): string {
  return "VixonPay is not configured (set VIXONPAY_API_KEY).";
}

/** Merchant reference — use OpenPay card top-up Mongo id (24 hex). */
export function vixonPayMerchantReference(topupId: string): string {
  const ref = topupId.replace(/[^a-zA-Z0-9]/g, "");
  return ref.length <= 64 ? ref : ref.slice(0, 64);
}

export type VixonPayCollectInput = {
  phone: string;
  amountUgx: number;
  reference: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
};

export type VixonPayCollectResult = {
  message: string;
  reference: string;
  internal_reference?: string;
};

export class VixonPayApiError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "VixonPayApiError";
    this.httpStatus = httpStatus;
  }
}

export async function vixonPayCollectMoney(input: VixonPayCollectInput): Promise<VixonPayCollectResult> {
  const apiKey = deploymentEnv("VIXONPAY_API_KEY");
  if (!apiKey) {
    throw new Error(vixonPayNotConfiguredMessage());
  }

  const body: Record<string, string | number> = {
    phone: input.phone,
    amount: Math.round(input.amountUgx),
    currency: "UGX",
    merchant_reference: input.reference,
    description: input.description.slice(0, 120),
  };
  if (input.customerEmail?.trim()) body.customer_email = input.customerEmail.trim();
  if (input.customerName?.trim()) body.customer_name = input.customerName.trim().slice(0, 120);

  const res = await fetch(`${VIXONPAY_API_BASE}/collections/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    message?: string;
    status?: string;
    data?: { internal_reference?: string; merchant_reference?: string };
  };

  if (!res.ok) {
    const raw = json.message ?? `VixonPay collect failed (${res.status})`;
    throw new VixonPayApiError(raw, res.status);
  }

  const accepted = res.status === 202 || json.status === "accepted";
  if (!accepted && json.status === "error") {
    throw new VixonPayApiError(json.message ?? "VixonPay rejected the collection request", res.status);
  }

  const internalRef = json.data?.internal_reference?.trim();
  const merchantRef = json.data?.merchant_reference?.trim() || input.reference;
  return {
    message:
      json.message?.trim() ||
      "Approve the mobile money prompt on your phone. Your card balance updates after confirmation.",
    reference: merchantRef,
    internal_reference: internalRef,
  };
}

export function isVixonPayWebhookSuccess(status: unknown): boolean {
  if (typeof status !== "string") return false;
  return status.trim().toLowerCase() === "completed";
}
