export type PaymentPublicStatus = {
  id: string;
  status: string;
  txHash?: string;
  confirmedAt?: string | null;
  tonAmount?: number;
  memo?: string | null;
  receiptAccessToken?: string | null;
};

export type FetchPaymentPublicResult =
  | { ok: true; payment: PaymentPublicStatus }
  | { ok: false; status: number; error?: string; rateLimited: boolean };

/** Poll payment status (public checkout endpoint). */
export async function fetchPaymentPublicStatus(paymentId: string): Promise<FetchPaymentPublicResult> {
  const r = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/public`);
  const j = (await r.json().catch(() => ({}))) as {
    payment?: PaymentPublicStatus;
    error?: string;
  };
  if (r.status === 429) {
    return { ok: false, status: 429, error: j.error ?? "Too many requests", rateLimited: true };
  }
  if (!r.ok || !j.payment) {
    return {
      ok: false,
      status: r.status,
      error: j.error,
      rateLimited: false,
    };
  }
  return { ok: true, payment: j.payment };
}
