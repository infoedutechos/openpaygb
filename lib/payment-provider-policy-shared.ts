export type PaymentProviderPolicy = Partial<Record<string, boolean>>;

export function parsePaymentProviderPolicy(raw: unknown): PaymentProviderPolicy {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PaymentProviderPolicy = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

/** Default true when master has not set a key. */
export function isPaymentProviderEnabledByMaster(
  code: string,
  policy?: PaymentProviderPolicy,
): boolean {
  const normalized = code.trim().toLowerCase();
  if (policy && Object.prototype.hasOwnProperty.call(policy, normalized)) {
    return policy[normalized] === true;
  }
  return true;
}
