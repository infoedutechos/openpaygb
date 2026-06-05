/** Reject webhook confirmation when provider amount does not match pending payment (UGX). */
export function webhookAmountMatchesPayment(
  paymentTotalUgx: number,
  webhookAmount: number | undefined,
  webhookCurrency: string | undefined,
): boolean {
  if (webhookAmount == null || !Number.isFinite(webhookAmount)) {
    return true;
  }
  const currency = (webhookCurrency ?? "UGX").trim().toUpperCase();
  if (currency !== "UGX" && currency !== "") {
    return false;
  }
  const expected = Math.round(paymentTotalUgx);
  const got = Math.round(webhookAmount);
  return Math.abs(got - expected) <= 1;
}
