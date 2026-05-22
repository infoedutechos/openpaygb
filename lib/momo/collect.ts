/**
 * Placeholder for **MTN MoMo Collection** / **Airtel** “request to pay” APIs.
 *
 * Typical env: `MOMO_SUBSCRIPTION_KEY`, `MOMO_API_USER`, `MOMO_API_KEY`, `MOMO_TARGET_ENVIRONMENT`,
 * callback host, and party IDs — see provider docs for your country product.
 *
 * Example call shape (not executed here):
 * ```ts
 * await fetch(process.env.MOMO_COLLECTION_URL!, {
 *   method: "POST",
 *   headers: { Authorization, "X-Target-Environment": "sandbox", "X-Reference-Id": paymentId },
 *   body: JSON.stringify({ amount: totalUgx, currency: "UGX", ... }),
 * });
 * ```
 */
export type InitiateCollectInput = {
  paymentId: string;
  amountUgx: number;
  phoneSubscriber: string;
  payerMessage?: string;
};

export async function initiateMomoCollect(_input: InitiateCollectInput): Promise<{ ok: boolean; note: string }> {
  void _input;
  const configured = Boolean(process.env.MOMO_SUBSCRIPTION_KEY?.trim());
  return {
    ok: configured,
    note: configured
      ? "Wire initiateMomoCollect() to your MoMo product (Collection, Sandbox → Production)."
      : "Set MOMO_SUBSCRIPTION_KEY and related vars; use POST /api/collect/momo to create the ledger row first.",
  };
}
