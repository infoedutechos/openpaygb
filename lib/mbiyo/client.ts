import { deploymentEnv } from "@/lib/deployment-env-resolve";
import { mbiyoRailError } from "@/lib/open-pay-brand";
import { isMbiyoConfigured, mbiyoNotConfiguredMessage } from "@/lib/mbiyo/config";

/**
 * MbiyoPay merchant API (Mbiyo payment rail; OpenPayGB brand at checkout).
 * @see https://dashboard.mbiyo.africa/docs/reference/merchant/payin
 */

const DEFAULT_BASE = "https://dashboard.mbiyo.africa/api/v1";

export type MbiyoPayinMetadata = {
  network: string;
  phone_number: string;
  country_code: string;
  om_otp?: string;
};

export type MbiyoPayinRequest = {
  amount: number;
  currency: string;
  order_id: string;
  callback_url?: string;
  metadata: MbiyoPayinMetadata;
};

export type MbiyoPayinData = {
  transaction_id: string;
  amount: number;
  fee?: number;
  charged_amount?: number;
  currency: string;
  order_id?: string;
  status: string;
  payment_method?: string;
  redirect_url?: string | null;
  instructions?: string | null;
  auth_mode?: string | null;
  created_at?: string;
};

export type MbiyoWrappedResponse<T> = {
  status: string;
  message?: string;
  data?: T;
};

export { isMbiyoConfigured, mbiyoNotConfiguredMessage };

function apiBase(): string {
  return deploymentEnv("MBIYO_API_BASE_URL") || DEFAULT_BASE;
}

function secretKey(): string {
  const k = deploymentEnv("MBIYO_SECRET_KEY");
  if (!k) throw new Error(mbiyoNotConfiguredMessage());
  return k;
}

function formatMbiyoError(
  res: Response,
  json: MbiyoWrappedResponse<unknown> | null,
): string {
  if (!json || typeof json !== "object") {
    return mbiyoRailError(`invalid response (HTTP ${res.status})`);
  }
  if (json.status !== "error") {
    return mbiyoRailError(`payin failed (HTTP ${res.status})`);
  }
  let msg = json.message ?? `HTTP ${res.status}`;
  const data = json.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val)) parts.push(`${key}: ${val.join(", ")}`);
      else if (typeof val === "string" || typeof val === "number") parts.push(`${key}: ${String(val)}`);
    }
    if (parts.length) msg = `${msg} — ${parts.join("; ")}`;
  }
  return mbiyoRailError(`payin failed: ${msg}`);
}

export async function mbiyoMerchantPayin(body: MbiyoPayinRequest): Promise<MbiyoWrappedResponse<MbiyoPayinData>> {
  const base = apiBase().replace(/\/$/, "");
  const res = await fetch(`${base}/merchant/payin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: body.amount,
      currency: body.currency,
      payment_method: "mobile_money",
      order_id: body.order_id,
      ...(body.callback_url ? { callback_url: body.callback_url } : {}),
      metadata: body.metadata,
    }),
  });
  const json = (await res.json().catch(() => null)) as MbiyoWrappedResponse<MbiyoPayinData> | null;
  if (!json || typeof json !== "object") {
    throw new Error(mbiyoRailError(`invalid response (${res.status})`));
  }
  if (!res.ok || json.status === "error") {
    throw new Error(formatMbiyoError(res, json));
  }
  return json;
}

export async function mbiyoGetTransaction(transactionId: string): Promise<MbiyoWrappedResponse<MbiyoPayinData>> {
  const base = apiBase().replace(/\/$/, "");
  const id = encodeURIComponent(transactionId);
  const res = await fetch(`${base}/merchant/transactions/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      Accept: "application/json",
    },
  });
  const json = (await res.json().catch(() => null)) as MbiyoWrappedResponse<MbiyoPayinData> | null;
  if (!json || typeof json !== "object") {
    throw new Error(mbiyoRailError(`invalid response (${res.status})`));
  }
  if (!res.ok || json.status === "error") {
    throw new Error(formatMbiyoError(res, json));
  }
  return json;
}
