import {
  isLivePayConfigured,
  isLivePayWebhookSuccess,
  livePayCustomerReference,
} from "@/lib/livepay/client";

const LIVEPAY_API_BASE = "https://livepay.me/api";

export type LivePayTransactionStatus = {
  success?: boolean;
  status?: string;
  message?: string;
  customer_reference?: string;
  internal_reference?: string;
  amount?: number;
  currency?: string;
  provider?: string;
};

export async function livePayFetchTransactionStatus(
  customerReference: string,
): Promise<LivePayTransactionStatus | null> {
  if (!isLivePayConfigured()) return null;

  const apiKey = process.env.LIVEPAY_API_KEY!.trim();
  const accountNumber = process.env.LIVEPAY_ACCOUNT_NUMBER!.trim();
  const reference = livePayCustomerReference(customerReference);

  const qs = new URLSearchParams({
    accountNumber,
    currency: "UGX",
    reference,
  });

  const res = await fetch(`${LIVEPAY_API_BASE}/transaction-status?${qs}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  const json = (await res.json().catch(() => null)) as LivePayTransactionStatus | null;
  if (!res.ok || !json) return null;
  return json;
}

export function isLivePayTransactionSuccessful(row: LivePayTransactionStatus): boolean {
  return isLivePayWebhookSuccess(row.status);
}
