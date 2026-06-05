import {
  isRelworxConfigured,
  isRelworxSuccessStatus,
  relworxCustomerReference,
} from "@/lib/relworx/client";

export type RelworxRequestStatus = {
  success?: boolean;
  status?: string;
  request_status?: string;
  message?: string;
  customer_reference?: string;
  internal_reference?: string;
  msisdn?: string;
  amount?: number;
  currency?: string;
  provider?: string;
  charge?: number;
};

export async function relworxFetchRequestStatus(
  internalReference: string,
): Promise<RelworxRequestStatus | null> {
  if (!isRelworxConfigured()) return null;

  const accountNo = process.env.RELWORX_ACCOUNT_NO!.trim();
  const qs = new URLSearchParams({
    account_no: accountNo,
    internal_reference: internalReference.trim(),
  });

  const apiKey = process.env.RELWORX_API_KEY!.trim();
  const res = await fetch(
    `https://payments.relworx.com/api/mobile-money/check-request-status?${qs}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.relworx.v2",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as RelworxRequestStatus | null;
  if (!json?.success) return null;
  return json;
}

export function isRelworxRequestSuccessful(row: RelworxRequestStatus): boolean {
  return isRelworxSuccessStatus(row.status) || isRelworxSuccessStatus(row.request_status);
}

/** Poll by payment id when internal ref not yet stored. */
export async function relworxFetchRequestStatusForPayment(
  paymentId: string,
  momoReference: string,
): Promise<RelworxRequestStatus | null> {
  const internal = momoReference.trim();
  if (internal && internal !== paymentId) {
    return relworxFetchRequestStatus(internal);
  }
  return relworxFetchRequestStatus(relworxCustomerReference(paymentId));
}
