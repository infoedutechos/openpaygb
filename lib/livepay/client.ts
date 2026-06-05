/**
 * LivePay REST API — https://docs.livepay.me/overview
 * Uganda UGX collections via MTN / AIRTEL.
 */

import { deploymentEnv } from "@/lib/deployment-env-resolve";

const LIVEPAY_API_BASE = "https://livepay.me/api";

export type LivePayNetwork = "MTN" | "AIRTEL";

export function isLivePayConfigured(): boolean {
  return Boolean(deploymentEnv("LIVEPAY_API_KEY") && deploymentEnv("LIVEPAY_ACCOUNT_NUMBER"));
}

export function livePayNotConfiguredMessage(): string {
  return "LivePay is not configured (set LIVEPAY_API_KEY and LIVEPAY_ACCOUNT_NUMBER).";
}

/** LivePay reference: no spaces, max 30 chars — use payment Mongo id (24 hex). */
export function livePayCustomerReference(paymentId: string): string {
  const ref = paymentId.replace(/[^a-zA-Z0-9]/g, "");
  return ref.length <= 30 ? ref : ref.slice(0, 30);
}

export type LivePayCollectInput = {
  phoneNumber: string;
  amountUgx: number;
  reference: string;
  description: string;
  network?: LivePayNetwork;
};

export type LivePayCollectResult = {
  success: boolean;
  message: string;
  reference: string;
  internal_reference?: string;
  network?: string;
};

/** LivePay HTTP error with vendor message (e.g. IP allowlist). */
export class LivePayApiError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "LivePayApiError";
    this.httpStatus = httpStatus;
  }
}

export function livePayUserMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const ip = msg.match(/IP\s+([\d.]+)\s+not allowed/i);
  if (ip) {
    return `LivePay blocked this server (IP ${ip[1]} not on your allowlist). In the LivePay dashboard, add that IP under API access, or disable IP restriction for local testing.`;
  }
  if (/Account number does not match/i.test(msg)) {
    return "LivePay account number does not match this API key. Check LIVEPAY_ACCOUNT_NUMBER in .env.local.";
  }
  if (/Invalid API key/i.test(msg)) {
    return "LivePay rejected the API key. Check LIVEPAY_API_KEY in .env.local.";
  }
  if (/pending approval|suspended|deactivated/i.test(msg)) {
    return "LivePay business account is not active. Complete verification in the LivePay dashboard.";
  }
  return msg;
}

export async function livePayCollectMoney(input: LivePayCollectInput): Promise<LivePayCollectResult> {
  const apiKey = deploymentEnv("LIVEPAY_API_KEY");
  const accountNumber = deploymentEnv("LIVEPAY_ACCOUNT_NUMBER");
  if (!apiKey || !accountNumber) {
    throw new Error(livePayNotConfiguredMessage());
  }

  const body: Record<string, string | number> = {
    accountNumber,
    phoneNumber: input.phoneNumber,
    amount: Math.round(input.amountUgx),
    currency: "UGX",
    reference: input.reference,
    description: input.description.slice(0, 120),
  };
  if (input.network) body.network = input.network;

  const res = await fetch(`${LIVEPAY_API_BASE}/collect-money`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as LivePayCollectResult & { error?: string };
  if (!res.ok) {
    const raw = json.error ?? json.message ?? `LivePay collect failed (${res.status})`;
    throw new LivePayApiError(raw, res.status);
  }
  return json;
}

export function isLivePayWebhookSuccess(status: unknown): boolean {
  if (typeof status !== "string") return false;
  return status.trim().toLowerCase() === "success";
}
