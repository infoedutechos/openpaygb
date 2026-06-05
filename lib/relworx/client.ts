/**
 * Relworx Payments API v2 — https://payments.relworx.com/docs/
 */

const RELWORX_API_BASE = "https://payments.relworx.com/api";
const RELWORX_ACCEPT = "application/vnd.relworx.v2";

export type RelworxCurrency = "UGX" | "KES" | "TZS";

export function relworxApiBase(): string {
  return RELWORX_API_BASE;
}

export function isRelworxConfigured(): boolean {
  if (process.env.RELWORX_ENABLED === "false") return false;
  return Boolean(process.env.RELWORX_API_KEY?.trim() && process.env.RELWORX_ACCOUNT_NO?.trim());
}

export function relworxNotConfiguredMessage(): string {
  return "Relworx is not configured (set RELWORX_API_KEY and RELWORX_ACCOUNT_NO).";
}

export function relworxCheckoutCurrency(): RelworxCurrency {
  const c = process.env.RELWORX_CURRENCY?.trim().toUpperCase();
  if (c === "KES" || c === "TZS") return c;
  return "UGX";
}

/** Relworx `reference` / `customer_reference`: 8–36 alphanumeric. */
export function relworxCustomerReference(paymentId: string): string {
  const ref = paymentId.replace(/[^a-zA-Z0-9]/g, "");
  if (ref.length < 8) return ref.padEnd(8, "0");
  return ref.length <= 36 ? ref : ref.slice(0, 36);
}

export type RelworxRequestPaymentInput = {
  msisdn: string;
  amount: number;
  reference: string;
  description: string;
  currency?: RelworxCurrency;
};

export type RelworxRequestPaymentResult = {
  success: boolean;
  message: string;
  internal_reference?: string;
};

export class RelworxApiError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "RelworxApiError";
    this.httpStatus = httpStatus;
  }
}

export function relworxUserMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const ip = msg.match(/IP\s+<--([^>]+)>/i) ?? msg.match(/Invalid access for IP\s+([\d.]+)/i);
  if (ip) {
    const addr = ip[1]?.trim() || "your server";
    return `Relworx blocked this server (IP ${addr} not allowlisted). Add the IP in the Relworx dashboard under authorized IPs.`;
  }
  if (/not authorized to access this business account/i.test(msg)) {
    return "Relworx API key cannot access this business account. Check RELWORX_ACCOUNT_NO.";
  }
  if (/API disabled for this account|API_DISABLED/i.test(msg)) {
    return "Relworx API is disabled for this business account. Ask Relworx support to enable API access (and UGX if needed).";
  }
  if (/Can't transact in UGX/i.test(msg)) {
    return "Relworx account is not enabled for UGX. Contact Relworx support.";
  }
  if (/rate.?limit|5 requests per 10 minutes/i.test(msg)) {
    return "Relworx limit: wait a few minutes before requesting another payment on this phone number.";
  }
  if (/Unauthorized|401/i.test(msg)) {
    return "Relworx rejected the API key. Check RELWORX_API_KEY.";
  }
  return msg;
}

export function isRelworxSuccessStatus(status: unknown): boolean {
  if (typeof status !== "string") return false;
  const s = status.trim().toLowerCase();
  return s === "success" || s === "successful";
}

async function relworxFetch(path: string, init: RequestInit): Promise<Response> {
  const apiKey = process.env.RELWORX_API_KEY?.trim();
  if (!apiKey) throw new Error(relworxNotConfiguredMessage());

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: RELWORX_ACCEPT,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  return fetch(`${RELWORX_API_BASE}${path}`, { ...init, headers, cache: "no-store" });
}

/** Collect from mobile money subscriber (USSD prompt). */
export async function relworxRequestPayment(
  input: RelworxRequestPaymentInput,
): Promise<RelworxRequestPaymentResult> {
  const accountNo = process.env.RELWORX_ACCOUNT_NO?.trim();
  if (!accountNo) throw new Error(relworxNotConfiguredMessage());

  const currency = input.currency ?? relworxCheckoutCurrency();
  const body = {
    account_no: accountNo,
    reference: relworxCustomerReference(input.reference),
    msisdn: input.msisdn.trim(),
    currency,
    amount: Number(input.amount),
    description: (input.description || "Tuition payment").slice(0, 200),
  };

  const res = await relworxFetch("/mobile-money/request-payment", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as RelworxRequestPaymentResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok || json.success === false) {
    const raw = json.message ?? json.error ?? `Relworx request-payment failed (${res.status})`;
    throw new RelworxApiError(raw, res.status);
  }
  return json;
}
