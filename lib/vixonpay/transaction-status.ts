import { deploymentEnv } from "@/lib/deployment-env-resolve";
import {
  isVixonPayConfigured,
  isVixonPayWebhookSuccess,
  vixonPayMerchantReference,
} from "@/lib/vixonpay/client";

const VIXONPAY_API_BASE = "https://my.vixonpay.com/api/v1";

export type VixonPayTransactionStatus = {
  transaction_status?: string;
  internal_reference?: string;
  merchant_reference?: string;
  transaction_amount?: string;
  request_currency?: string;
};

export async function vixonPayFetchTransactionStatus(
  merchantReference: string,
  internalReference?: string | null,
): Promise<VixonPayTransactionStatus | null> {
  if (!isVixonPayConfigured()) return null;

  const apiKey = deploymentEnv("VIXONPAY_API_KEY");
  const qs = new URLSearchParams();
  const internal = internalReference?.trim();
  if (internal) {
    qs.set("internal_reference", internal);
  } else {
    qs.set("merchant_reference", vixonPayMerchantReference(merchantReference));
  }

  const res = await fetch(`${VIXONPAY_API_BASE}/transactions/status?${qs}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  const json = (await res.json().catch(() => null)) as {
    status?: string;
    data?: VixonPayTransactionStatus;
  } | null;
  if (!res.ok || !json?.data) return null;
  return json.data;
}

export function isVixonPayTransactionSuccessful(row: VixonPayTransactionStatus): boolean {
  return isVixonPayWebhookSuccess(row.transaction_status);
}
