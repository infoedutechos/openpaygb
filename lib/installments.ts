/** Allowed installment counts at checkout (1 = pay in full). */
export const INSTALLMENT_COUNT_OPTIONS = [1, 2, 3, 4] as const;
export type InstallmentCountOption = (typeof INSTALLMENT_COUNT_OPTIONS)[number];

export type InstallmentSlice = {
  index: number;
  subtotalUgx: number;
  platformFeeUgx: number;
  totalUgx: number;
};

export type InstallmentSchedule = {
  count: InstallmentCountOption;
  slices: InstallmentSlice[];
  fullSubtotalUgx: number;
  platformFeePerInstallmentUgx: number;
  fullPlanTotalUgx: number;
};

/** Split integer UGX subtotal across N installments (remainder on earliest slices). */
export function splitSubtotalUgx(subtotalUgx: number, count: number): number[] {
  if (count < 1) throw new Error("installment count must be >= 1");
  const subtotal = Math.max(0, Math.round(subtotalUgx));
  const base = Math.floor(subtotal / count);
  const remainder = subtotal - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function buildInstallmentSchedule(
  subtotalUgx: number,
  platformFeeUgx: number,
  count: InstallmentCountOption,
): InstallmentSchedule {
  const fee = Math.max(0, Math.round(platformFeeUgx));
  const parts = splitSubtotalUgx(subtotalUgx, count);
  const slices: InstallmentSlice[] = parts.map((sub, i) => ({
    index: i + 1,
    subtotalUgx: sub,
    platformFeeUgx: fee,
    totalUgx: sub + fee,
  }));
  const fullPlanTotalUgx = slices.reduce((s, x) => s + x.totalUgx, 0);
  return {
    count,
    slices,
    fullSubtotalUgx: Math.max(0, Math.round(subtotalUgx)),
    platformFeePerInstallmentUgx: fee,
    fullPlanTotalUgx,
  };
}

export function normalizeInstallmentCount(raw: unknown): InstallmentCountOption {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 2 || n === 3 || n === 4) return n;
  return 1;
}
